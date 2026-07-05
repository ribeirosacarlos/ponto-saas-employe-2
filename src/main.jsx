import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'driver.js/dist/driver.css'
import './index.css'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import { AccessProvider } from './providers/AccessProvider.jsx'
import { ToastProvider } from './components/ui/use-toast.jsx'
import { Toaster } from './components/ui/toaster.jsx'
import { TimezoneProvider } from './providers/TimezoneProvider.jsx'
import './i18n/i18n.js'
import { shouldBlockFramedApp } from './lib/security/frameGuard.js'

if (shouldBlockFramedApp(window.location.pathname)) {
  document.body.innerHTML =
    '<main style="font-family: sans-serif; padding: 2rem; color: #111827;">Esta área não pode ser aberta em iframe.</main>'
  throw new Error('Blocked iframe rendering for sensitive route')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AccessProvider>
    <ThemeProvider defaultTheme="light">
      <ToastProvider>
        <TimezoneProvider>
          <App />
          <Toaster />
        </TimezoneProvider>
      </ToastProvider>
    </ThemeProvider>
  </AccessProvider>,
)
