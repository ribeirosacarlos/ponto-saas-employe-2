import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import TimeClock from './pages/TimeClock.jsx'
import { useAuthStore } from './store/useAuth.js'
import { useTheme } from './providers/ThemeProvider.jsx'
import { cn } from './lib/utils'

export default function App() {
  const token = useAuthStore((state) => state.token)
  const restoreSession = useAuthStore((state) => state.restoreSession)
  const { theme } = useTheme()
  const [currentPage, setCurrentPage] = useState('login')

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (token) {
      setCurrentPage((prev) => (prev === 'dashboard' ? 'dashboard' : 'timeClock'))
    } else {
      setCurrentPage('login')
    }
  }, [token])

  const handleGoToDashboard = () => setCurrentPage('dashboard')

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden text-foreground',
        theme === 'dark'
          ? 'bg-gradient-to-b from-[#050914] via-[#0a1224] to-background'
          : 'bg-gradient-to-b from-[#f7f8ff] via-[#eef3ff] to-[#e5edff]',
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-[#8b7bff]/18 blur-[110px]" />
        <div className="absolute right-[-5%] top-1/4 h-72 w-72 rounded-full bg-[#5c86ff]/16 blur-[110px]" />
        <div className="absolute bottom-[-12%] right-[-12%] h-80 w-80 rounded-full bg-[#9ad5ff]/12 blur-[120px]" />
      </div>
      <div className="relative z-10">
        {token ? (
          currentPage === 'dashboard' ? (
            <Dashboard />
          ) : (
            <TimeClock onContinueToDashboard={handleGoToDashboard} />
          )
        ) : (
          <Login />
        )}
      </div>
    </div>
  )
}
