'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type Team, type DirectorBoard } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Crown,
  Shield,
  Eye,
  Pencil,
  ClipboardList,
  Sun,
  Moon,
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
  } = useAppStore()

  const isMobile = useIsMobile()

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
      const res = await fetch('/api/teams')
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
      const res = await fetch(`/api/boards?teamId=${encodeURIComponent(teamId)}`)
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
      const res = await fetch(`/api/teams/join?teamId=${encodeURIComponent(teamId)}`)
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
      await loadTeams()
      setLoading(false)
    }
    init()
  }, [loadTeams])

  // Auto-select first team if none selected
  useEffect(() => {
    if (!currentTeam && teams.length > 0) {
      setCurrentTeam(teams[0])
    }
  }, [teams, currentTeam, setCurrentTeam])

  // Load boards when team changes
  useEffect(() => {
    if (currentTeam) {
      loadBoards(currentTeam.id)
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
      const res = await fetch('/api/teams', {
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
    } catch {
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
      const res = await fetch('/api/teams', {
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
      const res = await fetch(`/api/teams?teamId=${encodeURIComponent(currentTeam.id)}`, {
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
      const res = await fetch('/api/boards', {
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
      const res = await fetch('/api/boards', {
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
      const res = await fetch(`/api/boards?boardId=${encodeURIComponent(targetBoard.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除导演板失败')
        return
      }
      toast.success('导演板已删除')
      setDeleteBoardOpen(false)
      setTargetBoard(null)
      if (currentTeam) {
        await loadBoards(currentTeam.id)
      }
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
      const res = await fetch('/api/teams/join', {
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
      const res = await fetch(
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
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    reset()
    setView('landing')
    toast.success('已退出登录')
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

      {/* Create Team */}
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

      {/* Team List */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
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
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={handleCopyCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? '已复制' : '邀请链接'}
            </Button>
          </div>
        )}

        <Separator />

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

        <div className="ml-auto flex items-center gap-2">
          {/* Dark mode toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleToggleDarkMode}
                >
                  {darkMode || pageBg === 'black' ? (
                    <Sun className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {darkMode || pageBg === 'black' ? '切换浅色模式' : '切换深色模式'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Manage team dropdown */}
          {currentTeam && canManageTeam && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">团队成员</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openRenameTeam} className="gap-2">
                  <Edit className="h-4 w-4" />
                  重命名团队
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openManageMembers} className="gap-2">
                  <Users className="h-4 w-4" />
                  管理成员
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInviteLinkOpen(true)} className="gap-2">
                  <Copy className="h-4 w-4" />
                  邀请链接
                </DropdownMenuItem>
                {isTeamOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTeamOpen(true)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除团队
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Non-owners can still see members */}
          {currentTeam && !canManageTeam && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openManageMembers} className="gap-2">
                  <Users className="h-4 w-4" />
                  查看成员
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInviteLinkOpen(true)} className="gap-2">
                  <Copy className="h-4 w-4" />
                  邀请链接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Create Board */}
          {currentTeam && canCreateBoard && (
            <Button size="sm" className="gap-2" onClick={() => {
              setNewBoardName('')
              setCreateBoardOpen(true)
            }}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新建导演板</span>
            </Button>
          )}
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
                创建或选择一个团队开始你的分镜创作之旅
              </p>
              <Button onClick={() => {
                setNewTeamName('')
                setNewTeamIcon('🎬')
                setCreateTeamOpen(true)
              }}>
                <Plus className="mr-2 h-4 w-4" />
                创建团队
              </Button>
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
