import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/features.css'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { SettingsProvider } from './hooks/useSettings'

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error("Root element #root not found in DOM");
createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
