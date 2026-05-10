import { createContext, useContext, useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { LandingView } from '@/components/views/landing'
import { AuthView } from '@/components/views/auth'
import { DashboardView } from '@/components/views/dashboard'
import { BoardWorkspace } from '@/components/views/board-workspace'
import { InviteView } from '@/components/views/invite'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'

interface ThemeContextType {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') return stored
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default function App() {
  const { currentView, setUser, setView, setTeams } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setView('dashboard')
            const teamsRes = await fetch('/api/teams')
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json()
              setTeams(teamsData.teams || [])
            }
          }
        }
      } catch (_e) {
        // Not logged in, stay on landing
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [setUser, setView, setTeams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl">🎬</div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView />
      case 'login':
      case 'register':
        return <AuthView />
      case 'dashboard':
        return <DashboardView />
      case 'board':
        return <BoardWorkspace />
      case 'invite':
        return <InviteView />
      default:
        return <LandingView />
    }
  }

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        {renderView()}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
