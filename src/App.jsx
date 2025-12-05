import { useEffect } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import { useAuthStore } from './store/useAuth.js'
import { useTheme } from './providers/ThemeProvider.jsx'
import { cn } from './lib/utils'

export default function App() {
  const token = useAuthStore((state) => state.token)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const { theme } = useTheme()

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden text-foreground',
        theme === 'dark'
          ? 'bg-gradient-to-b from-emerald-950 via-[#04120d] to-background'
          : 'bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900',
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-5%] h-64 w-64 rounded-full bg-emerald-600/20 blur-3xl" />
        <div className="absolute right-[-5%] top-1/4 h-72 w-72 rounded-full bg-lime-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>
      <div className="relative z-10">
        {token ? <Dashboard /> : <Login />}
      </div>
    </div>
  )
}
