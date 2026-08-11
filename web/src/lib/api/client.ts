import axios, { type AxiosResponse } from 'axios'
import { toApiError } from './api-error'

/**
 * Cliente HTTP único contra la API.
 *
 * Dos decisiones de seguridad que no deben cambiarse a la ligera:
 *
 *  - `withCredentials: true` es lo que envía la cookie de sesión de Better Auth. Sin
 *    esto no hay autenticación posible.
 *  - **No se envía ninguna cabecera `Authorization`.** La sesión viaja en una cookie
 *    `HttpOnly` que el JavaScript no puede leer, y esa es justamente la garantía
 *    (SEC-002, ADR-0001). Si alguna vez aparece aquí un token en `localStorage` o en
 *    una cookie accesible, se ha perdido esa garantía.
 */
/**
 * Sin `VITE_API_URL` las peticiones son relativas, es decir, al mismo origen que sirve
 * la pagina. Es lo que se quiere: en desarrollo las pasa Vite y en produccion nginx.
 * Un solo origen evita que la cookie sea de terceros y evita que el navegador
 * descarte las imagenes publicas por politica de recursos cruzados.
 *
 * La variable sigue existiendo para quien despliegue la API en otro dominio.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** Respuesta de éxito de la API (ERS §48): los datos vienen envueltos. */
interface SuccessEnvelope<T> {
  data: T
  meta?: unknown
}

/** Metadatos de un listado paginado (ERS §47). */
export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PaginatedMeta {
  pagination: Pagination
  [key: string]: unknown
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => Promise.reject(toApiError(error))
)

/** Desempaqueta `{ data }` para que los llamadores no repitan `.data.data`. */
export async function get<T>(url: string, params?: unknown): Promise<T> {
  const response = await api.get<SuccessEnvelope<T>>(url, { params })
  return response.data.data
}

/** Igual que `get`, pero conservando `meta` para paginación y facets. */
export async function getWithMeta<T, M = PaginatedMeta>(
  url: string,
  params?: unknown
): Promise<{ data: T; meta: M }> {
  const response = await api.get<SuccessEnvelope<T>>(url, { params })
  return { data: response.data.data, meta: response.data.meta as M }
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.post<SuccessEnvelope<T>>(url, body)
  return response.data.data
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.patch<SuccessEnvelope<T>>(url, body)
  return response.data.data
}

/**
 * PUT para lo que se crea o se reemplaza sin distincion: escribir la cita de un trabajo
 * en un estilo es lo mismo la primera vez que la quinta.
 */
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.put<SuccessEnvelope<T>>(url, body)
  return response.data.data
}

/** Los DELETE de la API responden 204 sin cuerpo. */
export async function del(url: string, params?: unknown): Promise<void> {
  await api.delete(url, { params })
}

/**
 * Subida de archivos. No se fija `Content-Type` a propósito: el navegador debe
 * generarlo con el `boundary` del multipart, y ponerlo a mano lo rompe.
 */
export async function upload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  const response = await api.post<SuccessEnvelope<T>>(url, formData, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: (event) => {
      if (onProgress && event.total !== undefined && event.total > 0) {
        onProgress(Math.round((event.loaded * 100) / event.total))
      }
    },
  })
  return response.data.data
}
