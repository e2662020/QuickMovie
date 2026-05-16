'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type Team, type DirectorBoard, getPersonalTeam, PERSONAL_TEAM_ID, loadPersonalBoards, savePersonalBoards, type SavedServer, loadSavedServers } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAppMode } from '@/hooks/use-app-mode'
import { DEFAULT_SERVER, IS_DEV, IS_DEV_VERSION } from '@/lib/env'
import { OfflineIndicator } from '@/components/offline-indicator'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  Film,
  Plus,
  Users,
  LogOut,
  MoreVertical,
  Copy,
  Check,
  Trash2,
  Edit,
  UserPlus,
  Settings,
  Loader2,
  Menu,
  LayoutDashboard,
  Server,
  Crown,
  Shield,
  Eye,
  Pencil,
  ClipboardList,
  Sun,
  Moon,
  WifiOff,
  AlertTriangle,
  Circle,
} from 'lucide-react'
import { IconPicker, IconDisplay } from '@/components/icon-picker'

// ─── Constants ───────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner: '拥有者',
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
}

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-yellow-600',
  admin: 'text-blue-600',
  editor: 'text-green-600',
  viewer: 'text-gray-500',
}

interface TeamMember {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  role: string
  joinedAt: string
}

// ─── Component ───────────────────────────────────────────────────
export function DashboardView() {
  const {
    user,
    token,
    currentTeam,
    teams,
    boards,
    setUser,
    setToken,
    setTeams,
    setCurrentTeam,
    setBoards,
    setCurrentBoard,
    setView,
    setInviteCode,
    reset,
    darkMode,
    setDarkMode,
    pageBg,
    serverConfig,
    savedServers,
    switchServer,
    disconnectServer,
    connectServer,
    setAppMode,
  } = useAppStore()

  const isMobile = useIsMobile()
  const { isOffline, isRemote } = useAppMode()

  // Get preset servers list
  const getPresetServers = (): { name: string; url: string }[] => {
    const presets: { name: string; url: string }[] = []
    // Always show local dev server in client/dev mode
    if (IS_DEV_VERSION || IS_DEV) {
      presets.push({ name: '本地开发', url: 'http://localhost:3001' })
    }
    // Add servers from environment config
    if (DEFAULT_SERVER) {
      const entries = DEFAULT_SERVER.split(',').map((s) => s.trim()).filter(Boolean)
      for (const entry of entries) {
        const parts = entry.split('|')
        if (parts.length >= 2) {
          const name = parts[0].trim()
          const url = parts.slice(1).join('|').trim()
          if (name && url) {
            // Avoid duplicates
            if (!presets.find(p => p.url === url)) {
              presets.push({ name, url })
            }
          }
        }
      }
    }
    return presets
  }

  // ── Local State ──
  const [loading, setLoading] = useState(true)
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dialog states
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [createBoardOpen, setCreateBoardOpen] = useState(false)
  const [renameBoardOpen, setRenameBoardOpen] = useState(false)
  const [renameTeamOpen, setRenameTeamOpen] = useState(false)
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false)
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false)
  const [manageMembersOpen, setManageMembersOpen] = useState(false)
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false)
  const [showAddServer, setShowAddServer] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  // Add server form
  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerName, setNewServerName] = useState('')

  // Form values
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamIcon, setNewTeamIcon] = useState('🎬')
  const [newBoardName, setNewBoardName] = useState('')
  const [renameBoardName, setRenameBoardName] = useState('')
  const [renameTeamName, setRenameTeamName] = useState('')
  const [renameTeamIcon, setRenameTeamIcon] = useState('🎬')
  const [targetBoard, setTargetBoard] = useState<DirectorBoard | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Members
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Invite
  const [copied, setCopied] = useState(false)

  // ── Helpers ──
  const canManageTeam = currentTeam
    ? currentTeam.role === 'owner' || currentTeam.role === 'admin'
    : false

  const isTeamOwner = currentTeam
    ? currentTeam.ownerId === user?.id
    : false

  const canCreateBoard = currentTeam
    ? currentTeam.role !== 'viewer'
    : false

  const canManageBoard = (board: DirectorBoard) => {
    if (!currentTeam) return false
    return ['owner', 'admin'].includes(currentTeam.role) || board.createdBy === user?.id
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // ── API: Load Teams ──
  const loadTeams = useCallback(async () => {
    try {
      const res = await apiFetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [setTeams])

  // ── API: Load Boards ──
  const loadBoards = useCallback(async (teamId: string) => {
    setBoardsLoading(true)
    try {
      const res = await apiFetch(`/api/boards?teamId=${encodeURIComponent(teamId)}`)
      if (res.ok) {
        const data = await res.json()
        setBoards(data.boards ?? [])
      }
    } catch {
      // Silently fail
    } finally {
      setBoardsLoading(false)
    }
  }, [setBoards])

  // ── API: Load Members ──
  const loadMembers = useCallback(async (teamId: string) => {
    setMembersLoading(true)
    try {
      const res = await apiFetch(`/api/teams/join?teamId=${encodeURIComponent(teamId)}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
    } catch {
      // Silently fail
    } finally {
      setMembersLoading(false)
    }
  }, [])

  // ── Init ──
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      
      // Fix: Ensure appMode is correct when user is logged in with server config
      if (user && serverConfig && serverConfig.connectionStatus === 'connected') {
        setAppMode('remote')
      }
      
      await loadTeams()
      setLoading(false)
    }
    init()
  }, [loadTeams, user, serverConfig, setAppMode])

  // Auto-select first team if none selected
  useEffect(() => {
    if (!currentTeam) {
      if (isOffline) {
        // Offline mode: always show personal team
        setCurrentTeam(getPersonalTeam(user?.name))
      } else if (teams.length > 0) {
        setCurrentTeam(teams[0])
      }
    }
  }, [teams, currentTeam, setCurrentTeam, isOffline, user?.name])

  // Load boards when team changes
  useEffect(() => {
    if (currentTeam) {
      if (currentTeam.isPersonal) {
        // Personal team: load from localStorage
        const personalBoards = loadPersonalBoards()
        setBoards(personalBoards)
      } else {
        loadBoards(currentTeam.id)
      }
    } else {
      setBoards([])
    }
  }, [currentTeam, loadBoards, setBoards])

  // Toggle .dark class based on darkMode or black background
  useEffect(() => {
    const root = document.documentElement
    if (pageBg === 'black' || darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [pageBg, darkMode])

  useEffect(() => {
    const handleOpenAddServer = () => setShowAddServer(true)
    document.addEventListener('open-add-server-dialog', handleOpenAddServer)
    return () => document.removeEventListener('open-add-server-dialog', handleOpenAddServer)
  }, [])

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
  }, [darkMode, setDarkMode])

  // ── Handlers ──

  // Select team
  const handleSelectTeam = (team: Team) => {
    setCurrentTeam(team)
    setSidebarOpen(false)
  }

  // Create team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('请输入团队名称')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim(), icon: newTeamIcon }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '创建团队失败')
        return
      }
      toast.success('团队创建成功')
      setCreateTeamOpen(false)
      setNewTeamName('')
      setNewTeamIcon('🎬')
      await loadTeams()
      // Auto-select new team
      if (data.team) {
        setCurrentTeam(data.team)
      }
    } catch (err) {
      console.error('Error creating team:', err)
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Rename team
  const handleRenameTeam = async () => {
    if (!currentTeam || !renameTeamName.trim()) {
      toast.error('请输入团队名称')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: currentTeam.id, name: renameTeamName.trim(), icon: renameTeamIcon }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '重命名失败')
        return
      }
      toast.success('团队已重命名')
      setRenameTeamOpen(false)
      setRenameTeamName('')
      await loadTeams()
      if (data.team) {
        setCurrentTeam(data.team)
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete team
  const handleDeleteTeam = async () => {
    if (!currentTeam) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/teams?teamId=${encodeURIComponent(currentTeam.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除团队失败')
        return
      }
      toast.success('团队已删除')
      setDeleteTeamOpen(false)
      setCurrentTeam(null)
      setBoards([])
      await loadTeams()
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Create board
  const handleCreateBoard = async () => {
    if (!currentTeam || !newBoardName.trim()) {
      toast.error('请输入导演板名称')
      return
    }
    setSubmitting(true)
    try {
      if (currentTeam.isPersonal) {
        // Personal team: create board locally in localStorage
        const newBoard: DirectorBoard = {
          id: `personal-${Date.now()}`,
          name: newBoardName.trim(),
          teamId: PERSONAL_TEAM_ID,
          createdBy: user?.id || 'local',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const currentBoards = loadPersonalBoards()
        const updatedBoards = [...currentBoards, newBoard]
        savePersonalBoards(updatedBoards)
        setBoards(updatedBoards)
        toast.success('导演板创建成功')
        setCreateBoardOpen(false)
        setNewBoardName('')
        setCurrentBoard(newBoard)
        setView('board')
      } else {
        // Online team: create via API
        const res = await apiFetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newBoardName.trim(), teamId: currentTeam.id }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '创建导演板失败')
          return
        }
        toast.success('导演板创建成功')
        setCreateBoardOpen(false)
        setNewBoardName('')
        await loadBoards(currentTeam.id)
        // Open the new board
        if (data.board) {
          setCurrentBoard(data.board)
          setView('board')
        }
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Rename board
  const handleRenameBoard = async () => {
    if (!targetBoard || !renameBoardName.trim()) {
      toast.error('请输入导演板名称')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/boards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: targetBoard.id, name: renameBoardName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '重命名失败')
        return
      }
      toast.success('导演板已重命名')
      setRenameBoardOpen(false)
      setTargetBoard(null)
      setRenameBoardName('')
      if (currentTeam) {
        await loadBoards(currentTeam.id)
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete board
  const handleDeleteBoard = async () => {
    if (!targetBoard) return
    setSubmitting(true)
    try {
      if (currentTeam?.isPersonal) {
        // Personal team: delete from localStorage
        const currentBoards = loadPersonalBoards()
        const updatedBoards = currentBoards.filter(b => b.id !== targetBoard.id)
        savePersonalBoards(updatedBoards)
        setBoards(updatedBoards)
        toast.success('导演板已删除')
      } else {
        // Online team: delete via API
        const res = await apiFetch(`/api/boards?boardId=${encodeURIComponent(targetBoard.id)}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || '删除导演板失败')
          return
        }
        toast.success('导演板已删除')
      }
      setDeleteBoardOpen(false)
      setTargetBoard(null)
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Open board
  const handleOpenBoard = (board: DirectorBoard) => {
    setCurrentBoard(board)
    setView('board')
  }

  // Copy invite link
  const handleCopyInvite = () => {
    if (!currentTeam) return
    const link = `${window.location.origin}/invite?code=${currentTeam.inviteCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      toast.success('邀请链接已复制')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('复制失败，请手动复制')
    })
  }

  // Copy invite code
  const handleCopyCode = () => {
    if (!currentTeam) return
    navigator.clipboard.writeText(currentTeam.inviteCode).then(() => {
      setCopied(true)
      toast.success('邀请码已复制')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  // Update member role
  const handleUpdateRole = async (userId: string, role: string) => {
    if (!currentTeam) return
    try {
      const res = await apiFetch('/api/teams/join', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: currentTeam.id, userId, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '更新权限失败')
        return
      }
      toast.success('权限已更新')
      await loadMembers(currentTeam.id)
    } catch {
      toast.error('网络错误')
    }
  }

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    if (!currentTeam) return
    try {
      const res = await apiFetch(
        `/api/teams/join?teamId=${encodeURIComponent(currentTeam.id)}&userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '移除成员失败')
        return
      }
      toast.success('成员已移除')
      await loadMembers(currentTeam.id)
    } catch {
      toast.error('网络错误')
    }
  }

  // Open manage members
  const openManageMembers = async () => {
    if (!currentTeam) return
    await loadMembers(currentTeam.id)
    setManageMembersOpen(true)
  }

  // Logout
  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    reset()
    setView('landing')
    toast.success('已退出登录')
  }

  const handleSwitchServer = async (server: SavedServer) => {
    if (serverConfig?.serverUrl === server.url) return

    try {
      await switchServer(server.id)
      toast.success(`已切换到 ${server.name}`)
    } catch (error) {
      toast.error('切换服务器失败，请重试')
    }
  }

  const handleDisconnectServer = () => {
    disconnectServer()
    toast.success('已断开连接，进入离线模式')
  }

  const handleAddServer = async () => {
    if (!newServerUrl.trim()) {
      toast.error('请输入服务器地址')
      return
    }

    const url = newServerUrl.trim().replace(/\/+$/, '')
    const name = newServerName.trim() || url

    try {
      await connectServer(url, name)
      setShowAddServer(false)
      setNewServerUrl('')
      setNewServerName('')
      toast.success(`已连接到 ${name}`)
    } catch (error) {
      toast.error('连接服务器失败，请检查地址')
    }
  }

  const handleAddPresetServer = async (preset: { name: string; url: string }) => {
    try {
      await connectServer(preset.url, preset.name)
      toast.success(`已连接到 ${preset.name}`)
    } catch (error) {
      toast.error('连接服务器失败，请检查地址')
    }
  }

  // ── Open rename dialogs ──
  const openRenameTeam = () => {
    if (!currentTeam) return
    setRenameTeamName(currentTeam.name)
    setRenameTeamIcon(currentTeam.icon || '🎬')
    setRenameTeamOpen(true)
  }

  const openRenameBoard = (board: DirectorBoard) => {
    setTargetBoard(board)
    setRenameBoardName(board.name)
    setRenameBoardOpen(true)
  }

  const openDeleteBoard = (board: DirectorBoard) => {
    setTargetBoard(board)
    setDeleteBoardOpen(true)
  }

  // ── Render: Sidebar Content ──
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">快分镜</span>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Create Team - hidden in offline mode */}
      {!isOffline && (
      <div className="px-3 pt-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            setNewTeamName('')
            setNewTeamIcon('🎬')
            setCreateTeamOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          创建团队
        </Button>
      </div>
      )}

      {/* Team List */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {isOffline && (
            <button
              onClick={() => handleSelectTeam(getPersonalTeam(user?.name))}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                currentTeam?.id === PERSONAL_TEAM_ID
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg">🎬</span>
              <span className="flex-1 truncate">个人工作区</span>
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                个人
              </Badge>
            </button>
          )}
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleSelectTeam(team)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                currentTeam?.id === team.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              <IconDisplay value={team.icon} fallback="🎬" size="sm" />
              <span className="flex-1 truncate">{team.name}</span>
              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                {team.memberCount ?? 0}
              </Badge>
            </button>
          ))}
        </div>

        {teams.length === 0 && !loading && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            还没有团队
            <br />
            点击上方按钮创建
          </div>
        )}
      </ScrollArea>

      {/* Invite Link + User */}
      <div className="mt-auto">
        {currentTeam && (
          <div className="px-3 pb-2">
            {isOffline ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-muted-foreground/50 cursor-not-allowed"
                      disabled
                    >
                      <WifiOff className="h-4 w-4" />
                      协作功能不可用
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>协作功能需要连接到服务器</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={handleCopyInvite}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? '已复制' : '邀请链接'}
              </Button>
            )}
          </div>
        )}

        <Separator />

        {!isOffline && (
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        )}
      </div>
    </div>
  )

  // ── Render: Main Content ──
  const mainContent = (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
        {/* Mobile menu */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>团队列表</SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}

        {/* Team name */}
        {currentTeam ? (
          <div className="flex items-center gap-2">
            <IconDisplay value={currentTeam.icon} fallback="🎬" size="sm" />
            <h1 className="text-lg font-semibold">{currentTeam.name}</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {members.length > 0
                ? `${members.length} 位成员`
                : `${currentTeam.memberCount ?? 0} 位成员`}
            </Badge>
          </div>
        ) : (
          <h1 className="text-lg font-semibold">选择一个团队</h1>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Wide screen: individual icon buttons */}
          <div className="hidden lg:flex items-center gap-1">
            <OfflineIndicator />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" title={isOffline ? "连接服务器" : "服务器管理"}>
                  <Server className={`h-4 w-4 ${isOffline ? 'text-orange-500' : ''}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-[400px] overflow-y-auto">
                {(() => {
                  const presets = getPresetServers()
                  return presets.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">预设服务器</div>
                      {presets.map((preset) => (
                        <DropdownMenuItem key={preset.url} onClick={() => handleAddPresetServer(preset)} className={`gap-2 ${serverConfig?.serverUrl === preset.url ? 'bg-accent' : ''}`}>
                          <Server className="h-4 w-4 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{preset.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{preset.url}</p>
                          </div>
                          {serverConfig?.serverUrl === preset.url && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                      {(savedServers.length > 0 || !isOffline) && <DropdownMenuSeparator />}
                    </>
                  ) : null
                })()}
                {savedServers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">已保存的服务器</div>
                    {savedServers.map((server) => (
                      <DropdownMenuItem key={server.id} onClick={() => handleSwitchServer(server)} className={`gap-2 ${serverConfig?.serverUrl === server.url ? 'bg-accent' : ''}`}>
                        <Server className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm">{server.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{server.url}</p>
                        </div>
                        {server.isLastUsed && <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] flex-shrink-0">当前</Badge>}
                      </DropdownMenuItem>
                    ))}
                    {!isOffline && <DropdownMenuSeparator />}
                  </>
                )}
                <DropdownMenuItem onClick={() => setShowAddServer(true)}>
                  <Plus className="h-4 w-4" /> 添加自定义服务器
                </DropdownMenuItem>
                {!isOffline && serverConfig && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDisconnectConfirm(true)} className="gap-2 text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" /> 断开连接（离线模式）
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleToggleDarkMode}>
                    {darkMode || pageBg === 'black' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{darkMode || pageBg === 'black' ? '切换浅色模式' : '切换深色模式'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {currentTeam && canManageTeam && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={`h-9 w-9 ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isOffline}>
                            <Users className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {!isOffline && !currentTeam?.isPersonal && (
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={openRenameTeam} className="gap-2"><Edit className="h-4 w-4" /> 重命名团队</DropdownMenuItem>
                            <DropdownMenuItem onClick={openManageMembers} className="gap-2"><Users className="h-4 w-4" /> 管理成员</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setInviteLinkOpen(true)} className="gap-2"><Copy className="h-4 w-4" /> 邀请链接</DropdownMenuItem>
                            {isTeamOwner && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDeleteTeamOpen(true)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> 删除团队</DropdownMenuItem></>)}
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </span>
                  </TooltipTrigger>
                  {isOffline && <TooltipContent>协作功能需要连接到服务器</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )}

            {currentTeam && !canManageTeam && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={`h-9 w-9 ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isOffline}>
                            <Users className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {!isOffline && (
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={openManageMembers} className="gap-2"><Users className="h-4 w-4" /> 查看成员</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setInviteLinkOpen(true)} className="gap-2"><Copy className="h-4 w-4" /> 邀请链接</DropdownMenuItem>
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </span>
                  </TooltipTrigger>
                  {isOffline && <TooltipContent>协作功能需要连接到服务器</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )}

            {currentTeam && canCreateBoard && (
              <Button size="icon" variant="default" className="h-9 w-9" onClick={() => {
                setNewBoardName('')
                setCreateBoardOpen(true)
              }} title="新建导演板">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Narrow screen / mobile: consolidated menu */}
          <div className="lg:hidden flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${isOffline ? 'bg-muted-foreground/40' : isRemote ? 'bg-green-500' : 'bg-destructive'}`} />
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => document.dispatchEvent(new CustomEvent('open-status-dialog'))} className="gap-2">
                  {isOffline ? <WifiOff className="h-4 w-4 text-orange-500" /> : isRemote ? <Circle className="h-3 w-3 fill-green-500 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <span>{isOffline ? '离线模式' : isRemote ? (serverConfig?.serverName || '已连接') : '连接断开'}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Server className="h-4 w-4" /><span>服务器管理</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64">
                    {getPresetServers().length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">预设服务器</div>
                        {getPresetServers().map((preset) => (
                          <DropdownMenuItem key={preset.url} onClick={() => handleAddPresetServer(preset)} className="gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            <div className="flex-1 min-w-0"><p className="truncate text-sm">{preset.name}</p><p className="text-xs text-muted-foreground truncate">{preset.url}</p></div>
                            {serverConfig?.serverUrl === preset.url && <Check className="h-4 w-4 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                        {savedServers.length > 0 && <DropdownMenuSeparator />}
                      </>
                    )}
                    {savedServers.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">已保存的服务器</div>
                        {savedServers.map((server) => (
                          <DropdownMenuItem key={server.id} onClick={() => handleSwitchServer(server)} className="gap-2">
                            <Server className="h-4 w-4" />
                            <div className="flex-1 min-w-0"><p className="truncate text-sm">{server.name}</p><p className="text-xs text-muted-foreground truncate">{server.url}</p></div>
                            {server.isLastUsed && <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">当前</Badge>}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setShowAddServer(true)} className="gap-2"><Plus className="h-4 w-4" /> 添加自定义服务器</DropdownMenuItem>
                    {!isOffline && serverConfig && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowDisconnectConfirm(true)} className="gap-2 text-destructive focus:text-destructive"><LogOut className="h-4 w-4" /> 断开连接</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleToggleDarkMode} className="gap-2">
                  {darkMode || pageBg === 'black' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                  <span>{darkMode || pageBg === 'black' ? '浅色模式' : '深色模式'}</span>
                </DropdownMenuItem>

                {currentTeam && !currentTeam.isPersonal && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <Users className="h-4 w-4" /><span>团队</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        {canManageTeam && <DropdownMenuItem onClick={openRenameTeam} className="gap-2"><Edit className="h-4 w-4" /> 重命名团队</DropdownMenuItem>}
                        <DropdownMenuItem onClick={openManageMembers} className="gap-2"><Users className="h-4 w-4" /> {canManageTeam ? '管理成员' : '查看成员'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setInviteLinkOpen(true)} className="gap-2"><Copy className="h-4 w-4" /> 邀请链接</DropdownMenuItem>
                        {canManageTeam && isTeamOwner && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDeleteTeamOpen(true)} className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> 删除团队</DropdownMenuItem></>)}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                {currentTeam && canCreateBoard && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setNewBoardName(''); setCreateBoardOpen(true) }} className="gap-2">
                      <Plus className="h-4 w-4" /><span>新建导演板</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {!currentTeam ? (
          // No team selected
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <Film className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">欢迎使用快分镜</h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                {isOffline ? '个人工作区 - 在离线模式下管理你的导演板' : '创建或选择一个团队开始你的分镜创作之旅'}
              </p>
              {!isOffline && (
              <Button onClick={() => {
                setNewTeamName('')
                setNewTeamIcon('🎬')
                setCreateTeamOpen(true)
              }}>
                <Plus className="mr-2 h-4 w-4" />
                创建团队
              </Button>
              )}
              {isOffline && (
                <Button onClick={() => setCurrentTeam(getPersonalTeam(user?.name))}>
                  <Film className="mr-2 h-4 w-4" />
                  进入个人工作区
                </Button>
              )}
            </div>
          </div>
        ) : boardsLoading ? (
          // Loading boards
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          // Empty state
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">还没有导演板</h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                在这里创建你的第一个导演板，开始分镜规划
              </p>
              {canCreateBoard ? (
                <Button onClick={() => {
                  setNewBoardName('')
                  setCreateBoardOpen(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  新建导演板
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  你是查看者，无法创建导演板
                </p>
              )}
            </div>
          </div>
        ) : (
          // Board grid
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="group relative cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                onClick={() => handleOpenBoard(board)}
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Film className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-medium leading-snug">{board.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    创建于 {formatDate(board.createdAt)}
                  </p>

                  {/* Actions */}
                  {canManageBoard(board) && (
                    <div className="absolute right-3 top-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              openRenameBoard(board)
                            }}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            重命名
                          </DropdownMenuItem>
                          {['owner', 'admin'].includes(currentTeam?.role || '') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDeleteBoard(board)
                                }}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                删除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Create board card */}
            {canCreateBoard && (
              <Card
                className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary/50 hover:bg-accent/50"
                onClick={() => {
                  setNewBoardName('')
                  setCreateBoardOpen(true)
                }}
              >
                <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-medium">新建导演板</span>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )

  // ── Render ──
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden w-[280px] shrink-0 border-r bg-background md:block">
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      {mainContent}

      {/* ─── Dialogs ─── */}

      {/* Add Server Dialog */}
      <Dialog open={showAddServer} onOpenChange={setShowAddServer}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加服务器</DialogTitle>
            <DialogDescription>选择预设服务器或输入自定义地址</DialogDescription>
          </DialogHeader>

          {/* Preset Servers */}
          {(() => {
            const presets = getPresetServers()

            return presets.length > 0 ? (
              <div className="space-y-1.5 py-2">
                <Label className="text-xs font-medium text-muted-foreground">预设服务器</Label>
                <div className="grid gap-1.5">
                  {presets.map((preset) => (
                    <div
                      key={preset.url}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors hover:bg-accent ${
                        newServerUrl === preset.url ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => {
                        setNewServerUrl(preset.url)
                        setNewServerName(preset.name)
                      }}
                    >
                      <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{preset.name}</p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{preset.url}</p>
                      </div>
                      {newServerUrl === preset.url && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          <Separator />

          {/* Custom Server Input */}
          <div className="space-y-4 py-2">
            <Label className="text-xs font-medium text-muted-foreground">自定义服务器</Label>
            <div className="space-y-2">
              <Label htmlFor="server-url">服务器地址 *</Label>
              <Input
                id="server-url"
                placeholder="http://localhost:3000 或 https://your-server.com"
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddServer()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-name">服务器名称（可选）</Label>
              <Input
                id="server-name"
                placeholder="我的团队服务器"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddServer()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddServer(false)}>
              取消
            </Button>
            <Button onClick={handleAddServer} disabled={!newServerUrl.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              连接服务器
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirm Dialog */}
      <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              断开服务器连接
            </DialogTitle>
            <DialogDescription>
              确定要断开当前服务器连接吗？断开后将进入离线模式，只能查看本地保存的内容。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowDisconnectConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDisconnectConfirm(false)
                handleDisconnectServer()
              }}
            >
              确认断开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建团队</DialogTitle>
            <DialogDescription>为你的创作团队取一个名字</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>团队图标</Label>
              <IconPicker
                value={newTeamIcon}
                onChange={setNewTeamIcon}
                size="md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-name">团队名称</Label>
              <Input
                id="team-name"
                placeholder="输入团队名称"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateTeamOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleCreateTeam} disabled={submitting || !newTeamName.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Board Dialog */}
      <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建导演板</DialogTitle>
            <DialogDescription>为你的新导演板命名</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-name">导演板名称</Label>
              <Input
                id="board-name"
                placeholder="例如：短片《日出》分镜"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateBoardOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleCreateBoard} disabled={submitting || !newBoardName.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Board Dialog */}
      <Dialog open={renameBoardOpen} onOpenChange={setRenameBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名导演板</DialogTitle>
            <DialogDescription>修改导演板的名称</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-board-name">名称</Label>
              <Input
                id="rename-board-name"
                value={renameBoardName}
                onChange={(e) => setRenameBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameBoard()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameBoardOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleRenameBoard} disabled={submitting || !renameBoardName.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Board Dialog */}
      <Dialog open={deleteBoardOpen} onOpenChange={setDeleteBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除导演板</DialogTitle>
            <DialogDescription>
              确定要删除导演板「{targetBoard?.name}」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBoardOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBoard}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Team Dialog */}
      <Dialog open={renameTeamOpen} onOpenChange={setRenameTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名团队</DialogTitle>
            <DialogDescription>修改团队名称</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>团队图标</Label>
              <IconPicker
                value={renameTeamIcon}
                onChange={setRenameTeamIcon}
                size="md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rename-team-name">团队名称</Label>
              <Input
                id="rename-team-name"
                value={renameTeamName}
                onChange={(e) => setRenameTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameTeam()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTeamOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleRenameTeam} disabled={submitting || !renameTeamName.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除团队</DialogTitle>
            <DialogDescription>
              确定要删除团队「{currentTeam?.name}」吗？所有导演板和数据将被永久删除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTeamOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除团队
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageMembersOpen} onOpenChange={setManageMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>团队成员</DialogTitle>
            <DialogDescription>
              {currentTeam?.name} 的成员列表
            </DialogDescription>
          </DialogHeader>

          {membersLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-3">
                {members.map((member) => {
                  const isSelf = member.userId === user?.id
                  const RoleIcon = ROLE_ICONS[member.role] || Eye
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-muted-foreground">（你）</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      </div>

                      {/* Role display / selector */}
                      {isTeamOwner && !isSelf ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.userId, value)}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3" />
                                管理员
                              </span>
                            </SelectItem>
                            <SelectItem value="editor">
                              <span className="flex items-center gap-1.5">
                                <Pencil className="h-3 w-3" />
                                编辑者
                              </span>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <span className="flex items-center gap-1.5">
                                <Eye className="h-3 w-3" />
                                查看者
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                          <RoleIcon className={`h-3 w-3 ${ROLE_COLORS[member.role] || ''}`} />
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      )}

                      {/* Remove button */}
                      {isTeamOwner && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}

                {members.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    暂无成员
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageMembersOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={inviteLinkOpen} onOpenChange={setInviteLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请链接</DialogTitle>
            <DialogDescription>
              将以下链接分享给你的团队成员
            </DialogDescription>
          </DialogHeader>

          {currentTeam && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>邀请链接</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/invite?code=${currentTeam.inviteCode}`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopyInvite}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>邀请码</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={currentTeam.inviteCode}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteLinkOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
