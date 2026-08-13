import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { DbProvider } from './lib/store'
import { AuthProvider } from './lib/auth'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DbProvider>
        <App />
      </DbProvider>
    </AuthProvider>
  </StrictMode>,
)
