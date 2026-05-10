import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useRoutes } from 'react-router-dom'
import { useAppStore, type AppView } from '@/lib/store'
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

// Map URL path to view
const pathToView: Record<string, AppView> = {
  '/': 'landing',
  '/login': 'login',
  '/register': 'register',
  '/dashboard': 'dashboard',
  '/board': 'board',
  '/invite': 'invite',
}

// Map view to URL path
const viewToPath: Record<AppView, string> = {
  landing: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  board: '/board',
  invite: '/invite',
}

function MainContent() {
  const { currentView, setUser, setView, setTeams, setInviteCode } = useAppStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // Handle invite code from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code && window.location.pathname === '/invite') {
      setInviteCode(code)
      setView('invite')
    }
  }, [setView, setInviteCode])

  // Sync URL with currentView
  useEffect(() => {
    const expectedPath = viewToPath[currentView]
    if (window.location.pathname !== expectedPath) {
      navigate(expectedPath, { replace: true })
    }
  }, [currentView, navigate])

  // Sync currentView with URL on initial load
  useEffect(() => {
    const path = window.location.pathname
    const view = pathToView[path] || 'landing'
    setView(view)
  }, [setView])

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            // Only go to dashboard if no redirect, not already on invite, and not on board
            if (currentView !== 'invite' && currentView !== 'board') {
              setView('dashboard')
            }
            const teamsRes = await fetch('/api/teams')
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json()
              setTeams(teamsData.teams || [])
            }
          }
        }
      } catch {
        // Stay on landing
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [setUser, setView, setTeams, currentView])

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
    <>
      {renderView()}
      <Toaster />
    </>
  )
}

function AppRoutes() {
  const routes = useRoutes([
    { path: '/', element: <MainContent /> },
    { path: '/login', element: <MainContent /> },
    { path: '/register', element: <MainContent /> },
    { path: '/dashboard', element: <MainContent /> },
    { path: '/board', element: <MainContent /> },
    { path: '/invite', element: <MainContent /> },
    { path: '*', element: <MainContent /> },
  ])
  return routes
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <AppRoutes />
      </TooltipProvider>
    </ThemeProvider>
  )
}
