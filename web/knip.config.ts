import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  ignore: [
    'src/components/ui/**',
    'src/tanstack-table.d.ts',
  ],

  /**
   * Un tipo exportado que solo se usa en su propio archivo no es codigo muerto.
   *
   * Cada funcion del cliente declara el contrato de lo que acepta —`CourseWriteInput`,
   * `EventWriteInput`— y lo exporta para que se pueda nombrar desde fuera aunque hoy
   * nadie lo importe por su nombre. Quitarles el `export` dejaria funciones publicas con
   * parametros que no se pueden escribir. Las funciones muertas si se siguen avisando.
   */
  ignoreExportsUsedInFile: { interface: true, type: true },
}

export default config
