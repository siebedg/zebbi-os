import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'

import { FieldVisibilityProvider } from './hooks/useFieldVisibility.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FieldVisibilityProvider>
        <App />
      </FieldVisibilityProvider>
    </ThemeProvider>
  </StrictMode>,
)
