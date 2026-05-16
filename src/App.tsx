import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRoutes } from 'react-router-dom'
import { useAppStore, type AppView, getLastUsedServer, getDecryptedToken, addSavedServer } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { LandingView } from '@/components/views/landing'
import { AuthView } from '@/components/views/auth'
import { DashboardView } from '@/components/views/dashboard'
import { BoardWorkspace } from '@/components/views/board-workspace'
import { InviteView } from '@/components/views/invite'
import { SetupWizard } from '@/components/views/setup-wizard'
import { ServerSelect } from '@/components/views/server-select'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'
import { IS_SERVER_VERSION, IS_DEV_VERSION } from '@/lib/env'

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
  const { currentView, currentBoard, setUser, setView, setTeams, setCurrentBoard, setCurrentFile, setBoardFiles, setInviteCode, connectServer } = useAppStore()
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
        // Client version: auto-reconnect to last used server
        if (!IS_SERVER_VERSION) {
          const lastServer = getLastUsedServer()
          if (lastServer) {
            try {
              await connectServer(lastServer.url, lastServer.name)
              
              // Try auto-login with saved token
              const savedToken = getDecryptedToken(lastServer)
              if (savedToken) {
                try {
                  const loginRes = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: savedToken }),
                  })
                  if (loginRes.ok) {
                    const loginData = await loginRes.json()
                    if (loginData.user && loginData.token) {
                      setUser(loginData.user)
                      addSavedServer(lastServer.url, lastServer.name, loginData.token)
                    }
                  }
                } catch {
                  // Auto-login failed, user will see login page
                }
              }
            } catch {
              // Server unreachable, will show server selection or offline mode
            }
          }
        }

        // Setup wizard only available in server version
        if (IS_SERVER_VERSION) {
          try {
            const setupRes = await apiFetch('/api/setup/status')
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
        } else if (path === '/setup') {
          // Client version - redirect from /setup to landing
          setView('landing')
          setLoading(false)
          return
        }

      try {
        const res = await apiFetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            const teamsRes = await apiFetch('/api/teams')
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
          const boardRes = await apiFetch(`/api/boards/${encodeURIComponent(resolved.boardId)}`)
          if (boardRes.ok) {
            const boardData = await boardRes.json()
            if (boardData.board) {
              setCurrentBoard(boardData.board)
              // Also load board files to restore file selection
              const filesRes = await apiFetch(`/api/boards/files?boardId=${encodeURIComponent(resolved.boardId)}`)
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
      let view: AppView
      let isLoggedIn = false

      try {
        const res = await apiFetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            isLoggedIn = true
          }
        }
      } catch {
        // ignore auth errors
      }

      if (boardRestored) {
        view = 'board'
      } else if (resolved.view === 'board') {
        view = 'dashboard'
      } else if (IS_SERVER_VERSION && resolved.view === 'landing') {
        // Server version: show landing page (homepage)
        view = 'landing'
      } else if (!IS_SERVER_VERSION) {
        // Client version flow:
        // - If logged in → dashboard
        // - If not logged in → login page
        if (isLoggedIn) {
          view = 'dashboard'
        } else {
          view = 'login'
        }
      } else {
        view = resolved.view
      }
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
    // Server version: show landing page normally
    // Client version: skip landing, redirect to appropriate view
    if (currentView === 'landing') {
      if (IS_SERVER_VERSION) {
        return <LandingView />
      }
      // Client: should not reach here, but fallback to auth
      return <AuthView />
    }

    switch (currentView) {
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
  // Server version: never show server selection, always show app
  if (IS_SERVER_VERSION) {
    return <>{children}</>
  }

  // Client version (desktop): show server selection when no mode selected
  const { serverConfig, appMode } = useAppStore()
  const [showOfflinePrompt, setShowOfflinePrompt] = useState(false)
  const savedServers = typeof window !== 'undefined' ? getLastUsedServer() : null

  const needsServerSelection = typeof window !== 'undefined'
    && !serverConfig
    && !localStorage.getItem('quickmovie-app-mode')

  // Network status detection
  useEffect(() => {
    if (IS_SERVER_VERSION || typeof window === 'undefined') return

    const handleOffline = () => {
      if (appMode === 'remote') {
        setShowOfflinePrompt(true)
      }
    }

    const handleOnline = () => {
      setShowOfflinePrompt(false)
      const lastServer = getLastUsedServer()
      if (lastServer && localStorage.getItem('quickmovie-app-mode') === 'offline') {
        useAppStore.getState().connectServer(lastServer.url, lastServer.name)
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [appMode])

  if (needsServerSelection && !savedServers) {
    return <ServerSelect />
  }

  // Show offline prompt when network is lost
  if (showOfflinePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-md w-full mx-4 p-6 rounded-xl bg-white dark:bg-slate-800 shadow-lg text-center">
          <div className="text-5xl mb-4">📡</div>
          <h2 className="text-xl font-bold mb-2">网络连接已断开</h2>
          <p className="text-muted-foreground mb-6">
            检测到网络不可用。是否切换到离线模式继续使用？
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                useAppStore.getState().disconnectServer()
                setShowOfflinePrompt(false)
              }}
            >
              进入离线模式
            </Button>
            <Button onClick={() => setShowOfflinePrompt(false)}>
              稍后再说
            </Button>
          </div>
        </div>
      </div>
    )
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
