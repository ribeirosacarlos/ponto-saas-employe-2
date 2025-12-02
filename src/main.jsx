import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import { ToastProvider } from './components/ui/use-toast.jsx'
import { Toaster } from './components/ui/toaster.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark">
      <ToastProvider>
        <App />
        <Toaster />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
