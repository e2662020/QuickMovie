import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============ Types ============
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
  role: string // user's role in this team
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
  size?: number
  mimeType?: string
  createdAt: string
}

// ============ View Types ============
export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'board'
  | 'invite'

// ============ App Store ============
interface AppState {
  // Auth
  user: User | null
  token: string | null

  // Navigation
  currentView: AppView
  previousView: AppView | null

  // Team
  currentTeam: Team | null
  teams: Team[]

  // Board
  currentBoard: DirectorBoard | null
  currentFile: BoardFile | null
  boards: DirectorBoard[]
  boardFiles: BoardFile[]
  storyElements: StoryElement[]
  resources: Resource[]

  // Invite
  inviteCode: string | null

  // UI State
  sidebarOpen: boolean
  resourcePanelOpen: boolean

  // Actions
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
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,

      // Navigation
      currentView: 'landing',
      previousView: null,

      // Team
      currentTeam: null,
      teams: [],

      // Board
      currentBoard: null,
      currentFile: null,
      boards: [],
      boardFiles: [],
      storyElements: [],
      resources: [],

      // Invite
      inviteCode: null,

      // UI
      sidebarOpen: true,
      resourcePanelOpen: false,

      // Actions
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
    }),
    {
      name: 'quick-storyboard-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
)
