import { readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../../../config/env.js'
import { logger } from '../../../shared/logging/logger.js'
import { disconnectDatabase, prisma } from '../../database/prisma/client.js'

/**
 * Barrido de huerfanos (plan seccion 4.4, paso 7).
 *
 * Disco y base de datos pueden desincronizarse si el proceso muere entre la escritura
 * del archivo y el INSERT, o entre el DELETE de la fila y el borrado del binario.
 * Ninguno de los dos casos rompe la aplicacion, pero ambos acumulan basura.
 *
 * Este script reconcilia:
 *   - archivos sin fila -> se borran;
 *   - filas sin archivo -> se registran, NO se borran (borrar una fila referenciada
 *     romperia claves foraneas; la decision es de un humano);
 *   - temporales antiguos -> se borran.
 *
 * Uso: corepack pnpm storage:sweep
 */

const HORAS_PARA_CADUCAR_TEMPORAL = 24

async function listarArchivos(directorio: string, prefijo = ''): Promise<string[]> {
  const entradas = await readdir(directorio, { withFileTypes: true }).catch(() => [])
  const encontrados: string[] = []

  for (const entrada of entradas) {
    const relativo = prefijo === '' ? entrada.name : `${prefijo}/${entrada.name}`
    if (entrada.isDirectory()) {
      encontrados.push(...(await listarArchivos(path.join(directorio, entrada.name), relativo)))
    } else {
      encontrados.push(relativo)
    }
  }

  return encontrados
}

async function limpiarTemporales(raiz: string): Promise<number> {
  const directorio = path.join(raiz, 'tmp')
  const entradas = await readdir(directorio).catch(() => [])
  const limite = Date.now() - HORAS_PARA_CADUCAR_TEMPORAL * 60 * 60 * 1000
  let borrados = 0

  for (const entrada of entradas) {
    const completa = path.join(directorio, entrada)
    const info = await stat(completa).catch(() => null)
    // Solo los antiguos: uno reciente puede pertenecer a una subida en curso.
    if (info !== null && info.mtimeMs < limite) {
      await rm(completa, { force: true })
      borrados += 1
    }
  }

  return borrados
}

async function main(): Promise<void> {
  const raiz = path.resolve(env.STORAGE_ROOT)

  const enDisco = new Set<string>()
  for (const visibilidad of ['public', 'private']) {
    const archivos = await listarArchivos(path.join(raiz, visibilidad), visibilidad)
    for (const archivo of archivos) enDisco.add(archivo)
  }

  const filas = await prisma.mediaAsset.findMany({ select: { id: true, storageKey: true } })
  const registradas = new Set(filas.map((fila) => fila.storageKey))

  const archivosSinFila = [...enDisco].filter((clave) => !registradas.has(clave))
  const filasSinArchivo = filas.filter((fila) => !enDisco.has(fila.storageKey))

  for (const clave of archivosSinFila) {
    await rm(path.join(raiz, clave), { force: true })
  }

  const temporales = await limpiarTemporales(raiz)

  logger.info(
    {
      archivosEnDisco: enDisco.size,
      filas: filas.length,
      archivosHuerfanosBorrados: archivosSinFila.length,
      // Se informan pero no se tocan: pueden estar referenciadas por works o cursos.
      filasSinArchivo: filasSinArchivo.map((fila) => fila.id),
      temporalesBorrados: temporales,
    },
    'Barrido de almacenamiento completado',
  )
}

main()
  .then(async () => {
    await disconnectDatabase()
  })
  .catch(async (error: unknown) => {
    logger.fatal({ err: error }, 'Barrido fallido')
    await disconnectDatabase()
    process.exitCode = 1
  })
