import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Global console helper to wipe all local data
;(window as any).clearAllData = () => {
  localStorage.clear()
  sessionStorage.clear()
  console.log('All local data, cache, and authentication credentials have been deleted.')
  window.location.reload()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
