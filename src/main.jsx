import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { DbProvider } from './lib/store'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DbProvider>
      <App />
    </DbProvider>
  </StrictMode>,
)
