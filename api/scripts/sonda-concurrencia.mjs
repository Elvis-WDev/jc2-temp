#!/usr/bin/env node
/**
 * Doce altas simultaneas con el mismo titulo.
 *
 * Comprueba que la carrera entre "existe este slug?" y el INSERT se resuelve sola: las
 * doce deben crearse, con doce slugs distintos, sin que ninguna reciba un 409. Antes del
 * reintento en `escribirConSlugLibre`, dos pasaban y diez morian con "Conflict".
 *
 *   node scripts/sonda-concurrencia.mjs                      # contra localhost:4000
 *   API=http://localhost:8080 node scripts/sonda-concurrencia.mjs
 *
 * Necesita ADMIN_EMAIL y ADMIN_PASSWORD en el entorno, o un archivo de entorno:
 *   node --env-file=../.env.dev scripts/sonda-concurrencia.mjs
 */
const API = process.env.API ?? 'http://localhost:4000'
const CUANTAS = Number(process.env.CUANTAS ?? 12)

async function peticion(ruta, opciones = {}, cookie = '') {
  const res = await fetch(API + ruta, {
    ...opciones,
    headers: {
      ...(typeof opciones.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      // Better Auth rechaza un Origin nulo, que es lo que manda `fetch` de Node.
      Origin: API,
      ...(cookie ? { cookie } : {}),
      ...(opciones.headers ?? {}),
    },
  })
  const texto = await res.text()
  let cuerpo = null
  try {
    cuerpo = JSON.parse(texto)
  } catch {
    cuerpo = texto.slice(0, 200)
  }
  return { status: res.status, cuerpo }
}

const entrada = await fetch(`${API}/api/admin/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: API },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
})
if (entrada.status !== 200) {
  console.error(`No se pudo entrar (${entrada.status}). Revisa ADMIN_EMAIL y ADMIN_PASSWORD.`)
  process.exit(1)
}
const cookie = (entrada.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')

const tipo = await peticion('/api/admin/work-types', {}, cookie)
const persona = await peticion('/api/admin/persons?page=1&page_size=1', {}, cookie)
const workTypeId = tipo.cuerpo?.data?.[0]?.id
const personId = persona.cuerpo?.data?.[0]?.id

const titulo = `SONDA DE CARRERA ${Date.now()}`
const cuerpo = JSON.stringify({
  title: titulo,
  workTypeId,
  academicStatus: 'work_in_progress',
  editorialStatus: 'draft',
  authors: personId ? [{ personId, authorOrder: 1 }] : [],
})

const resultados = await Promise.all(
  Array.from({ length: CUANTAS }, () =>
    peticion('/api/admin/works', { method: 'POST', body: cuerpo }, cookie),
  ),
)

const creados = resultados.filter((r) => r.status === 201).map((r) => r.cuerpo.data)
const slugs = creados.map((c) => c.slug)
const conflictos = resultados.filter((r) => r.status === 409).length
const errores = resultados.filter((r) => r.status >= 500).length

for (const creado of creados) {
  await peticion(`/api/admin/works/${creado.id}`, { method: 'DELETE' }, cookie)
}

console.log(`altas simultaneas : ${CUANTAS}`)
console.log(`creadas           : ${creados.length}`)
console.log(`slugs distintos   : ${new Set(slugs).size}`)
console.log(`conflictos (409)  : ${conflictos}`)
console.log(`errores (5xx)     : ${errores}`)

const bien = creados.length === CUANTAS && new Set(slugs).size === CUANTAS && errores === 0
console.log(
  bien ? '\nOK: las doce se crearon con slugs distintos.' : '\nFALLO: la carrera no se resuelve.',
)
process.exit(bien ? 0 : 1)
