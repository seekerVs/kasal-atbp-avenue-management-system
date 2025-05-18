import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import { FirebaseAuthProvider } from './contexts/AuthContext.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <FirebaseAuthProvider> */}
      <App />
    {/* </FirebaseAuthProvider> */}
  </StrictMode>,
)
