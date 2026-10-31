import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LockScreenSelfTest } from './native/LockScreenSelfTest'

// CI-only simulator check of the iOS lock screen (see LockScreenSelfTest).
const selfTest = import.meta.env.VITE_LOCKSCREEN_SELFTEST === '1'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {selfTest ? <LockScreenSelfTest /> : <App />}
  </StrictMode>,
)
