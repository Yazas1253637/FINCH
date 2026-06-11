import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { StoreProvider } from './store/StoreProvider.jsx'
import './styles/index.css'

// Service worker powers offline support for the web/PWA build. It can't run on
// the Electron app://local origin (and isn't needed there — the app is local),
// so only register over http/https.
if (location.protocol === 'http:' || location.protocol === 'https:') {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
