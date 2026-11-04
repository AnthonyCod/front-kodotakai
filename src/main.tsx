import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import './index.css'

async function enableMocking() {
  // Lectura estática (no `env.apiMocking`) para que Vite elimine MSW del build cuando no se usa.
  const mode = import.meta.env.VITE_API_MOCKING
  if (mode !== 'true' && mode !== 'asesor') return
  try {
    // `asesor`: solo el CRM del asesor simulado (aún no está en el backend); el resto, real.
    const { worker } =
      mode === 'asesor' ? await import('@/mocks/asesor-browser') : await import('@/mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  } catch (error) {
    // La app debe cargar aunque el navegador no permita service workers.
    console.error('[mocks] No se pudo iniciar MSW; las llamadas irán al backend real.', error)
  }
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
