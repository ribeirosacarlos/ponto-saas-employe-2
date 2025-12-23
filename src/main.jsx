import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import { ToastProvider } from './components/ui/use-toast.jsx'
import { Toaster } from './components/ui/toaster.jsx'
import './i18n/i18n.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light">
      <ToastProvider>
        <App />
        <Toaster />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
