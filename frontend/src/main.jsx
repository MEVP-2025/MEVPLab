import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initApiConfig } from './config/api.js'

// Initialize API config (resolve dynamic ports from Electron) before rendering
initApiConfig().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
