import { create } from 'zustand'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface Team {
  id: string
  name: string
  icon?: string
  inviteCode: string
  ownerId: string
  role: string
  memberCount?: number
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

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'board'
  | 'invite'

interface AppState {
  user: User | null
  token: string | null

  currentView: AppView
  previousView: AppView | null

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

  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setView: (view: AppView) => void
  goBack: () => void
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
  reset: () => void
}

export const useAppStore = create<AppState>()((set, get) => ({
  user: null,
  token: null,

  currentView: 'landing',
  previousView: null,

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
  darkMode: false,

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
  setDarkMode: (dark) => set({ darkMode: dark }),
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
  }),
}))
