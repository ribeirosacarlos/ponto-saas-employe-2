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
        'relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300',
        theme === 'dark'
          ? 'bg-gradient-to-b from-[#060915] via-[#0d1629] to-background'
          : 'bg-gradient-to-b from-primary/8 via-[#f3f5ff] to-background',
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-primary/16 blur-[120px] dark:bg-primary/24" />
        <div className="absolute right-[-5%] top-1/4 h-72 w-72 rounded-full bg-sky-300/16 blur-[120px] dark:bg-sky-400/12" />
        <div className="absolute bottom-[-12%] right-[-12%] h-80 w-80 rounded-full bg-indigo-200/14 blur-[130px] dark:bg-indigo-500/12" />
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
