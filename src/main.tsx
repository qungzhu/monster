import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LockScreenSelfTest } from './native/LockScreenSelfTest'

// CI-only simulator check of the iOS lock screen (see LockScreenSelfTest).
const selfTest = import.meta.env.VITE_LOCKSCREEN_SELFTEST === '1'

// CI-only simulator screenshots (VITE_SIM_DEMO=world|life): start as a user
// who has already named themselves and adopted the Himalayan, so the
// simulator lands in the living world instead of the first-run prompt.
if (import.meta.env.VITE_SIM_DEMO && !localStorage.getItem('fp-user-name')) {
  localStorage.setItem('fp-user-name', JSON.stringify('小鱼'))
  localStorage.setItem('fp-selected-character', JSON.stringify('xiaoxue'))
  localStorage.setItem('fp-adopted-breed', JSON.stringify('plush-himalayan'))
  localStorage.setItem('fp-intimacy-levels', JSON.stringify({ xiaoxue: 3 }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {selfTest ? <LockScreenSelfTest /> : <App />}
  </StrictMode>,
)
