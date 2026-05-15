import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRoutes } from 'react-router-dom'
import { useAppStore, type AppView } from '@/lib/store'
import { LandingView } from '@/components/views/landing'
import { AuthView } from '@/components/views/auth'
import { DashboardView } from '@/components/views/dashboard'
import { BoardWorkspace } from '@/components/views/board-workspace'
import { InviteView } from '@/components/views/invite'
import { SetupWizard } from '@/components/views/setup-wizard'
import { ServerSelect } from '@/components/views/server-select'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

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
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [])

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
  '/setup': 'setup',
}

// Resolve URL path to view and optional boardId/fileId
function resolvePath(path: string): { view: AppView; boardId?: string; fileId?: string } {
  const boardMatch = path.match(/^\/board\/([^/?]+)/)
  if (boardMatch) {
    const params = new URLSearchParams(window.location.search)
    return { view: 'board', boardId: boardMatch[1], fileId: params.get('file') || undefined }
  }
  if (path === '/board') return { view: 'dashboard' }
  const view = pathToView[path]
  return { view: view || 'landing' }
}

// Map view to URL path (board handled separately due to boardId param)
const viewToPath: Record<AppView, string> = {
  landing: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  board: '/dashboard',
  invite: '/invite',
  setup: '/setup',
}

function MainContent() {
  const { currentView, currentBoard, setUser, setView, setTeams, setCurrentBoard, setCurrentFile, setBoardFiles, setInviteCode } = useAppStore()
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  // Single init effect: only run once on first mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const path = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const resolved = resolvePath(path)

    // Set invite code if present on /invite page
    if (code && path === '/invite') {
      setInviteCode(code)
    }

    // Check auth first, then set view based on result
    async function init() {
      // Check setup status first
      try {
        const setupRes = await fetch('/api/setup/status')
        if (setupRes.ok) {
          const setupData = await setupRes.json()
          if (!setupData.installed) {
            setView('setup')
            setLoading(false)
            return
          }
          if (path === '/setup') {
            setView('landing')
            setLoading(false)
            return
          }
        }
      } catch {
        // ignore setup check errors
      }

      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            const teamsRes = await fetch('/api/teams')
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json()
              setTeams(teamsData.teams || [])
            }
          }
        }
      } catch {
        // ignore auth errors
      }

      // Restore board state from URL if direct board link
      let boardRestored = false
      if (resolved.view === 'board' && resolved.boardId) {
        try {
          const boardRes = await fetch(`/api/boards/${encodeURIComponent(resolved.boardId)}`)
          if (boardRes.ok) {
            const boardData = await boardRes.json()
            if (boardData.board) {
              setCurrentBoard(boardData.board)
              // Also load board files to restore file selection
              const filesRes = await fetch(`/api/boards/files?boardId=${encodeURIComponent(resolved.boardId)}`)
              if (filesRes.ok) {
                const filesData = await filesRes.json()
                setBoardFiles(filesData.files || [])
                if (resolved.fileId) {
                  const file = filesData.files?.find((f: any) => f.id === resolved.fileId)
                  if (file) setCurrentFile(file)
                }
              }
              boardRestored = true
            }
          }
        } catch {
          // board not found or error, fall back to dashboard
        }
      }

      // Set view AFTER auth check and board restore
      const view = boardRestored ? 'board' : (resolved.view === 'board' ? 'dashboard' : resolved.view)
      setView(view)
      setLoading(false)
    }
    init()
  }, [setUser, setView, setTeams, setInviteCode])

  // Sync URL when view changes (but not on init to avoid loops)
  useEffect(() => {
    if (loading) return
    let expectedPath: string
    if (currentView === 'board' && currentBoard) {
      expectedPath = `/board/${currentBoard.id}`
    } else {
      expectedPath = viewToPath[currentView] || '/'
    }
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState(null, '', expectedPath)
    }
  }, [currentView, currentBoard, loading])

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
      case 'setup':
        return <SetupWizard />
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
    { path: '/board/:boardId', element: <MainContent /> },
    { path: '/board', element: <MainContent /> },
    { path: '/invite', element: <MainContent /> },
    { path: '/setup', element: <MainContent /> },
    { path: '*', element: <MainContent /> },
  ])
  return routes
}

function FirstLaunchGuard({ children }: { children: React.ReactNode }) {
  const serverConfig = useAppStore((s) => s.serverConfig)
  const isFirstLaunch = typeof window !== 'undefined'
    && !serverConfig
    && !localStorage.getItem('quickmovie-app-mode')

  if (isFirstLaunch) {
    return <ServerSelect />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <FirstLaunchGuard>
            <AppRoutes />
          </FirstLaunchGuard>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
