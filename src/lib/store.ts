import { create } from 'zustand'
import { IS_SERVER_VERSION } from '@/lib/env'
import { apiFetch } from '@/lib/api'

export const PERSONAL_TEAM_ID = 'personal'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  roles?: string[]
}

export interface Team {
  id: string
  name: string
  icon?: string
  inviteCode: string
  ownerId: string
  role: string
  memberCount?: number
  isPersonal?: boolean
}

export interface BoardFile {
  id: string
  boardId: string
  parentId?: string | null
  name: string
  type: 'planning' | 'storyboard' | 'script' | 'storyboard_shot' | 'word' | 'excel' | 'note' | 'folder'
  content?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  children?: BoardFile[]
}

export interface DirectorBoard {
  id: string
  name: string
  teamId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface StoryElement {
  id: string
  boardId: string
  fileId?: string | null
  type: 'mind_map' | 'story_segment' | 'character' | 'scene'
  name: string
  content?: string
  color?: string
  position?: string
  createdAt: string
  updatedAt: string
}

export interface Resource {
  id: string
  boardId: string
  fileId?: string | null
  name: string
  type: string
  url: string
  originalUrl?: string | null
  size?: number
  mimeType?: string
  createdAt: string
}

export type AppMode = 'offline' | 'remote'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ServerConfig {
  serverUrl: string
  serverName: string
  authToken: string | null
  connectionStatus: ConnectionStatus
}

export interface PendingSyncAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
}

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'board'
  | 'invite'
  | 'setup'

interface AppState {
  user: User | null
  token: string | null

  currentView: AppView
  previousView: AppView | null
  redirectAfterLogin: AppView | null

  currentTeam: Team | null
  teams: Team[]

  currentBoard: DirectorBoard | null
  currentFile: BoardFile | null
  boards: DirectorBoard[]
  boardFiles: BoardFile[]
  storyElements: StoryElement[]
  resources: Resource[]

  inviteCode: string | null

  sidebarOpen: boolean
  resourcePanelOpen: boolean
  pageBg: string
  darkMode: boolean
  deletedFiles: BoardFile[]
  deletedFilesTimeout: ReturnType<typeof setTimeout> | null

  appMode: AppMode
  serverConfig: ServerConfig | null
  savedServers: SavedServer[]
  pendingSyncActions: PendingSyncAction[]
  lastSyncTimestamp: number | null

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setView: (view: AppView) => void
  goBack: () => void
  setRedirectAfterLogin: (view: AppView | null) => void
  setCurrentTeam: (team: Team | null) => void
  setTeams: (teams: Team[]) => void
  setCurrentBoard: (board: DirectorBoard | null) => void
  setCurrentFile: (file: BoardFile | null) => void
  setBoards: (boards: DirectorBoard[]) => void
  setBoardFiles: (files: BoardFile[]) => void
  setStoryElements: (elements: StoryElement[]) => void
  setResources: (resources: Resource[]) => void
  setInviteCode: (code: string | null) => void
  setSidebarOpen: (open: boolean) => void
  setResourcePanelOpen: (open: boolean) => void
  setPageBg: (bg: string) => void
  setDarkMode: (dark: boolean) => void
  addDeletedFile: (file: BoardFile) => void
  undoDeleteFile: () => BoardFile | null
  clearDeletedFiles: () => void

  setAppMode: (mode: AppMode) => void
  setServerConfig: (config: ServerConfig | null) => void
  connectServer: (url: string, name: string) => Promise<void>
  disconnectServer: () => void
  loadSavedServers: () => void
  switchServer: (serverId: string) => Promise<void>

  addPendingSyncAction: (action: Omit<PendingSyncAction, 'id' | 'timestamp'>) => void
  clearPendingSyncActions: () => void
  syncPendingActions: () => Promise<void>

  reset: () => void
}

const STORAGE_KEY = 'quickmovie-offline-data'
const PERSONAL_BOARDS_KEY = 'quickmovie-personal-boards'
const SAVED_SERVERS_KEY = 'quickmovie-saved-servers'

export interface SavedServer {
  id: string
  url: string
  name: string
  encryptedToken?: string
  lastConnected?: string
  isLastUsed?: boolean
}

const ENCRYPTION_KEY = 'QM-Secure-Key-2024'

const simpleEncrypt = (text: string): string => {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    result += String.fromCharCode(charCode)
  }
  return btoa(encodeURIComponent(result))
}

const simpleDecrypt = (encoded: string): string => {
  try {
    const decoded = atob(encoded)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      result += String.fromCharCode(charCode)
    }
    return decodeURIComponent(result)
  } catch {
    return ''
  }
}

const loadOfflineData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const saveOfflineData = (data: Partial<AppState>) => {
  try {
    const existing = loadOfflineData() || {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }))
  } catch {}
}

export const loadPersonalBoards = (): DirectorBoard[] => {
  try {
    const raw = localStorage.getItem(PERSONAL_BOARDS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export const savePersonalBoards = (boards: DirectorBoard[]) => {
  try {
    localStorage.setItem(PERSONAL_BOARDS_KEY, JSON.stringify(boards))
  } catch {}
}

export const getPersonalTeam = (userName?: string): Team => ({
  id: PERSONAL_TEAM_ID,
  name: '个人工作区',
  icon: '🎬',
  inviteCode: '',
  ownerId: 'personal',
  role: 'owner',
  memberCount: 1,
  isPersonal: true,
})

export const loadSavedServers = (): SavedServer[] => {
  try {
    const raw = localStorage.getItem(SAVED_SERVERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

const saveSavedServers = (servers: SavedServer[]) => {
  try {
    localStorage.setItem(SAVED_SERVERS_KEY, JSON.stringify(servers))
  } catch {}
}

export const addSavedServer = (url: string, name: string, token?: string): SavedServer[] => {
  const servers = loadSavedServers()
  servers.forEach(s => { s.isLastUsed = false })
  
  const existingIndex = servers.findIndex(s => s.url === url)
  const newServer: SavedServer = {
    id: existingIndex >= 0 ? servers[existingIndex].id : `server-${Date.now()}`,
    url,
    name,
    encryptedToken: token ? simpleEncrypt(token) : undefined,
    lastConnected: new Date().toISOString(),
    isLastUsed: true,
  }
  
  if (existingIndex >= 0) {
    servers[existingIndex] = newServer
  } else {
    servers.push(newServer)
  }
  
  saveSavedServers(servers)
  return servers
}

export const removeSavedServer = (serverId: string): SavedServer[] => {
  const servers = loadSavedServers().filter(s => s.id !== serverId)
  saveSavedServers(servers)
  return servers
}

export const getLastUsedServer = (): SavedServer | null => {
  const servers = loadSavedServers()
  return servers.find(s => s.isLastUsed) || null
}

export const getDecryptedToken = (server: SavedServer): string | null => {
  if (!server.encryptedToken) return null
  const decrypted = simpleDecrypt(server.encryptedToken)
  return decrypted || null
}

export const useAppStore = create<AppState>()((set, get) => ({
  user: null,
  token: null,

  currentView: 'landing',
  previousView: null,
  redirectAfterLogin: null,

  currentTeam: null,
  teams: [],

  currentBoard: null,
  currentFile: null,
  boards: [],
  boardFiles: [],
  storyElements: [],
  resources: [],

  inviteCode: null,

  sidebarOpen: true,
  resourcePanelOpen: false,
  pageBg: typeof window !== 'undefined' ? localStorage.getItem('script-editor-bg') || 'white' : 'white',
  darkMode: typeof window !== 'undefined' ? (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) : false,
  deletedFiles: [],
  deletedFilesTimeout: null,

  appMode: IS_SERVER_VERSION ? 'remote' : 'offline',
  serverConfig: null,
  savedServers: typeof window !== 'undefined' ? loadSavedServers() : [],
  pendingSyncActions: [],
  lastSyncTimestamp: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setView: (view) => {
    const prev = get().currentView
    set({ currentView: view, previousView: prev })
  },
  goBack: () => {
    const prev = get().previousView
    if (prev) {
      set({ currentView: prev, previousView: null })
    }
  },
  setRedirectAfterLogin: (view) => set({ redirectAfterLogin: view }),
  setCurrentTeam: (team) => set({ currentTeam: team }),
  setTeams: (teams) => set({ teams }),
  setCurrentBoard: (board) => set({ currentBoard: board, currentFile: null, boardFiles: [] }),
  setCurrentFile: (file) => set({ currentFile: file }),
  setBoards: (boards) => set({ boards }),
  setBoardFiles: (files) => set({ boardFiles: files }),
  setStoryElements: (elements) => set({ storyElements: elements }),
  setResources: (resources) => set({ resources }),
  setInviteCode: (code) => set({ inviteCode: code }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setResourcePanelOpen: (open) => set({ resourcePanelOpen: open }),
  setPageBg: (bg) => {
    try { localStorage.setItem('script-editor-bg', bg) } catch { /* ignore */ }
    set({ pageBg: bg })
  },
  setDarkMode: (dark) => {
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
    set({ darkMode: dark })
  },
  addDeletedFile: (file) => {
    const state = get()
    if (state.deletedFilesTimeout) {
      clearTimeout(state.deletedFilesTimeout)
    }
    const timeout = setTimeout(() => {
      set({ deletedFiles: [], deletedFilesTimeout: null })
    }, 30000)
    set({ 
      deletedFiles: [...state.deletedFiles, file], 
      deletedFilesTimeout: timeout 
    })
  },
  undoDeleteFile: () => {
    const state = get()
    if (state.deletedFiles.length === 0) return null
    const file = state.deletedFiles[state.deletedFiles.length - 1]
    const newDeletedFiles = state.deletedFiles.slice(0, -1)
    if (newDeletedFiles.length === 0 && state.deletedFilesTimeout) {
      clearTimeout(state.deletedFilesTimeout)
    }
    set({ 
      deletedFiles: newDeletedFiles,
      deletedFilesTimeout: newDeletedFiles.length === 0 ? null : state.deletedFilesTimeout
    })
    return file
  },
  clearDeletedFiles: () => {
    const state = get()
    if (state.deletedFilesTimeout) {
      clearTimeout(state.deletedFilesTimeout)
    }
    set({ deletedFiles: [], deletedFilesTimeout: null })
  },

  setAppMode: (mode) => {
    try { localStorage.setItem('quickmovie-app-mode', mode) } catch {}
    set({ appMode: mode })
  },

  setServerConfig: (config) => set({ serverConfig: config }),

  connectServer: async (url, name) => {
    set({
      serverConfig: {
        serverUrl: url,
        serverName: name,
        authToken: null,
        connectionStatus: 'connecting',
      },
    })

    try {
      const healthUrl = `${url}/api/health`
      const response = await fetch(healthUrl)
      if (!response.ok) throw new Error('Server unreachable')

      set({
        appMode: 'remote',
        serverConfig: {
          serverUrl: url,
          serverName: name,
          authToken: null,
          connectionStatus: 'connected',
        },
        savedServers: addSavedServer(url, name),
      })
      try { localStorage.setItem('quickmovie-app-mode', 'remote') } catch {}
    } catch {
      set({
        serverConfig: {
          serverUrl: url,
          serverName: name,
          authToken: null,
          connectionStatus: 'error',
        },
      })
    }
  },

  disconnectServer: () => {
    set({
      appMode: 'offline',
      serverConfig: null,
    })
    try { localStorage.setItem('quickmovie-app-mode', 'offline') } catch {}
  },

  loadSavedServers: () => {
    const servers = loadSavedServers()
    set({ savedServers: servers })
  },

  switchServer: async (serverId) => {
    const servers = get().savedServers
    const targetServer = servers.find(s => s.id === serverId)
    if (!targetServer) return

    await get().connectServer(targetServer.url, targetServer.name)

    const token = getDecryptedToken(targetServer)
    if (token) {
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user && data.token) {
            addSavedServer(targetServer.url, targetServer.name, data.token)
            set({ user: data.user, token: data.token })
          }
        }
      } catch {
        // Auto-login failed, user needs to login manually
      }
    }
  },

  addPendingSyncAction: (action) => {
    const pendingAction: PendingSyncAction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: action.type,
      payload: action.payload,
      timestamp: Date.now(),
    }
    const updated = [...get().pendingSyncActions, pendingAction]
    set({ pendingSyncActions: updated })
    saveOfflineData({ pendingSyncActions: updated } as Partial<AppState>)
  },

  clearPendingSyncActions: () => {
    set({ pendingSyncActions: [] })
    saveOfflineData({ pendingSyncActions: [] } as Partial<AppState>)
  },

  syncPendingActions: async () => {
    const { serverConfig, pendingSyncActions } = get()
    if (!serverConfig || serverConfig.connectionStatus !== 'connected') return
    if (pendingSyncActions.length === 0) return

    for (const action of pendingSyncActions) {
      try {
        await fetch(`${serverConfig.serverUrl}/api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        })
      } catch {}
    }

    set({
      pendingSyncActions: [],
      lastSyncTimestamp: Date.now(),
    })
    saveOfflineData({ lastSyncTimestamp: Date.now() } as Partial<AppState>)
  },

  reset: () => set({
    user: null,
    token: null,
    currentView: 'landing',
    currentTeam: null,
    teams: [],
    currentBoard: null,
    currentFile: null,
    boards: [],
    boardFiles: [],
    storyElements: [],
    resources: [],
    deletedFiles: [],
    deletedFilesTimeout: null,
    appMode: 'offline',
    serverConfig: null,
    pendingSyncActions: [],
    lastSyncTimestamp: null,
  }),
}))
