import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { ApiError } from '@/lib/api/api-error'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount > 3) return false

        // Reintentar un 401 o un 403 no cambia nada: no es un fallo transitorio, es
        // una respuesta. Tampoco un 404 ni un 422.
        if (
          error instanceof ApiError &&
          error.status < 500 &&
          error.status !== 0
        ) {
          return false
        }

        return true
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      // Todas las mutaciones fallidas pasan por el mismo traductor de errores, que ya
      // distingue error de campo, error de negocio y fallo inesperado.
      onError: (error) => {
        handleServerError(error)
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (!(error instanceof ApiError)) return

      // Una cookie caducada se manifiesta como 401 en cualquier peticion. Se corta
      // aqui, en un solo sitio, en lugar de que cada pantalla lo maneje.
      if (error.status === 401) {
        toast.error('Your session has expired.')
        useAuthStore.getState().reset()
        queryClient.clear()
        void router.navigate({
          to: '/sign-in',
          search: { redirect: router.history.location.href },
        })
      }

      if (error.status === 403) {
        toast.error('You do not have permission for this action.')
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
