'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type BoardFile, type Resource } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PlanningEditor } from '@/components/editors/planning-editor'
import { StoryboardEditor } from '@/components/editors/storyboard-editor'
import { ScriptEditor } from '@/components/editors/script-editor'
import { ShotEditor } from '@/components/editors/shot-editor'
import { NoteEditor } from '@/components/editors/note-editor'


import { Button } from '@/components/ui/button'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Folder,
  FolderOpen,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Film,
  StickyNote,
  Table,
  File,
  Upload,
  Image,
  FileSpreadsheet,
  FileArchive,

  Loader2,
  PanelRightOpen,
  PanelRightClose,
  Menu,
  Sparkles,
  Type,
  Lightbulb,
  Palette,
  Check,
  Sun,
  Moon,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const FILE_TYPE_CONFIG: Record<
  BoardFile['type'],
  { label: string; icon: typeof File; color: string }
> = {
  planning: { label: '策划案', icon: ClipboardList, color: 'text-blue-500' },
  storyboard: { label: '故事板', icon: LayoutDashboard, color: 'text-purple-500' },
  script: { label: '剧本', icon: FileText, color: 'text-amber-500' },
  storyboard_shot: { label: '分镜', icon: Film, color: 'text-rose-500' },
  word: { label: '文档', icon: File, color: 'text-sky-500' },
  excel: { label: '表格', icon: Table, color: 'text-emerald-500' },
  note: { label: '笔记', icon: StickyNote, color: 'text-yellow-500' },
  folder: { label: '文件夹', icon: Folder, color: 'text-amber-600' },
}

const PAGE_BG_OPTIONS: { value: string; label: string; color: string; dark: boolean }[] = [
  { value: 'white', label: '白色', color: '#ffffff', dark: false },
  { value: 'black', label: '黑色', color: '#1a1a1a', dark: true },
  { value: 'blue', label: '淡蓝', color: '#eef6fc', dark: false },
  { value: 'green', label: '淡绿', color: '#edf7ed', dark: false },
  { value: 'yellow', label: '淡黄', color: '#fef9e7', dark: false },
]

const getPageBgColor = (bg: string): string => {
  return PAGE_BG_OPTIONS.find(o => o.value === bg)?.color || '#ffffff'
}

const CREATABLE_TYPES: Exclude<BoardFile['type'], 'word' | 'excel'>[] = [
  'planning',
  'storyboard',
  'script',
  'storyboard_shot',
  'note',
  'folder',
]

const RESOURCE_TYPE_ICONS: Record<string, typeof File> = {
  image: Image,
  pdf: FileText,
  document: File,
  spreadsheet: FileSpreadsheet,
  other: FileArchive,
}

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  image: 'text-emerald-500',
  pdf: 'text-red-500',
  document: 'text-blue-500',
  spreadsheet: 'text-emerald-600',
  other: 'text-gray-500',
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ═══════════════════════════════════════════════════════════════════
// Placeholder Editor Components
// ═══════════════════════════════════════════════════════════════════

function PlaceholderEditor({
  type,
  name,
  icon: Icon,
  color,
}: {
  type: string
  name: string
  icon: typeof File
  color: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted/50">
        <Icon className={cn('h-12 w-12', color)} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">{name}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {type} 编辑器正在开发中，敬请期待…
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        AI 辅助创作功能即将上线
      </div>
    </div>
  )
}

function NoteEditorPlaceholder() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-medium">笔记编辑器</h2>
        <p className="text-sm text-muted-foreground">
          支持 Markdown 格式，可随时记录灵感
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Type className="h-10 w-10" />
          <p className="text-sm">笔记编辑器正在开发中…</p>
        </div>
      </div>
    </div>
  )
}

function FolderContentPlaceholder({ folderName }: { folderName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
        <FolderOpen className="h-10 w-10 text-amber-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold">{folderName}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          此文件夹的内容显示在左侧文件树中
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Editor Router
// ═══════════════════════════════════════════════════════════════════

function EditorArea({
  file,
  boardId,
}: {
  file: BoardFile | null
  boardId: string
}) {
  if (!file) {
    return <WelcomeScreen />
  }

  if (file.type === 'folder') {
    return <FolderContentPlaceholder folderName={file.name} />
  }

  const config = FILE_TYPE_CONFIG[file.type]
  if (!config) {
    return <PlaceholderEditor type={file.type} name={file.name} icon={File} color="text-gray-500" />
  }

  switch (file.type) {
    case 'planning':
      return <PlanningEditor />
    case 'storyboard':
      return <StoryboardEditor />
    case 'script':
      return <ScriptEditor />
    case 'storyboard_shot':
      return <ShotEditor />
    case 'note':
      return <NoteEditor />
    case 'word':
      return <PlaceholderEditor type="文档" name={file.name} icon={config.icon} color={config.color} />
    case 'excel':
      return <PlaceholderEditor type="表格" name={file.name} icon={config.icon} color={config.color} />
    default:
      return <PlaceholderEditor type={file.type} name={file.name} icon={File} color="text-gray-500" />
  }
}

// ═══════════════════════════════════════════════════════════════════
// Welcome Screen (no file selected)
// ═══════════════════════════════════════════════════════════════════

function WelcomeScreen() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
          <Lightbulb className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">欢迎使用快分镜工作台</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          从左侧文件树创建或选择一个文件开始创作。你可以创建策划案、故事板、剧本、分镜等不同类型的文件。
        </p>
        <Separator className="my-6" />
        <div className="grid grid-cols-2 gap-4 text-left">
          {[
            { icon: ClipboardList, label: '策划案', desc: '项目规划与前期准备', color: 'text-blue-500' },
            { icon: LayoutDashboard, label: '故事板', desc: '故事结构与场景梳理', color: 'text-purple-500' },
            { icon: FileText, label: '剧本', desc: '台词与剧本编写', color: 'text-amber-500' },
            { icon: Film, label: '分镜', desc: '镜头与画面分镜设计', color: 'text-rose-500' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
            >
              <item.icon className={cn('mt-0.5 h-5 w-5 shrink-0', item.color)} />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// File Tree Item (recursive)
// ═══════════════════════════════════════════════════════════════════

interface FileTreeItemProps {
  file: BoardFile
  depth: number
  currentFile: BoardFile | null
  expandedFolders: Set<string>
  onToggleFolder: (fileId: string) => void
  onSelectFile: (file: BoardFile) => void
  onRename: (file: BoardFile) => void
  onDelete: (file: BoardFile) => void
  childrenFiles: BoardFile[]
}

function FileTreeItem({
  file,
  depth,
  currentFile,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onRename,
  onDelete,
  childrenFiles,
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(file.id)
  const isSelected = currentFile?.id === file.id
  const isFolder = file.type === 'folder'
  const config = FILE_TYPE_CONFIG[file.type]

  const Icon = isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : config?.icon || File

  const iconColor = config?.color || 'text-gray-500'

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    // We use the dropdown menu instead of custom context menu
  }

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'text-foreground/80 hover:bg-muted'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            onToggleFolder(file.id)
          }
          onSelectFile(file)
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/Collapse arrow for folders */}
        {isFolder && (
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-muted-foreground/10"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFolder(file.id)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        {!isFolder && <span className="w-5" />}

        {/* Icon */}
        <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />

        {/* Name */}
        <span className="ml-1.5 flex-1 truncate">{file.name}</span>

        {/* Actions (3-dot menu) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-muted-foreground/10 group-hover:opacity-100',
                isSelected && 'opacity-60'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onRename(file)
              }}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(file)
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children (when folder expanded) */}
      {isFolder && isExpanded && childrenFiles.length > 0 && (
        <div>
          {childrenFiles
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((child) => (
              <FileTreeItemMemo
                key={child.id}
                file={child}
                depth={depth + 1}
                currentFile={currentFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                onRename={onRename}
                onDelete={onDelete}
                childrenFiles={[]} // Nested children loaded separately
              />
            ))}
        </div>
      )}
    </div>
  )
}

// Memoize the tree item to prevent unnecessary re-renders
const FileTreeItemMemo = React.memo(FileTreeItem)

// ═══════════════════════════════════════════════════════════════════
// New File Button
// ═══════════════════════════════════════════════════════════════════

function NewFileButton({
  onCreate,
  parentId,
  disabled,
}: {
  onCreate: (type: BoardFile['type'], parentId?: string) => void
  parentId?: string
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">新建文件</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-48">
        {CREATABLE_TYPES.map((type) => {
          const config = FILE_TYPE_CONFIG[type]
          const Icon = config.icon
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => onCreate(type, parentId)}
              className="gap-2.5"
            >
              <Icon className={cn('h-4 w-4', config.color)} />
              <span>{config.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Resource Panel
// ═══════════════════════════════════════════════════════════════════

function ResourcePanel({
  boardId,
  resources,
  onUpload,
  onDelete,
  uploading,
}: {
  boardId: string
  resources: Resource[]
  onUpload: (files: FileList) => void
  onDelete: (resource: Resource) => void
  uploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">资源库</h3>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs touch-manipulation select-none cursor-pointer"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            上传
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={handleFileChange}
            style={{ 
              opacity: 0, 
              position: 'absolute', 
              width: '100%', 
              height: '100%',
              top: 0,
              left: 0,
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Resource List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50">
                <Image className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">暂无资源</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  点击上传按钮添加素材
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {resources.map((resource) => {
                const ResIcon =
                  RESOURCE_TYPE_ICONS[resource.type] || FileArchive
                const resColor =
                  RESOURCE_TYPE_COLORS[resource.type] || 'text-gray-500'
                const isImage = resource.type === 'image'

                return (
                  <div
                    key={resource.id}
                    className="group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    {/* Thumbnail or icon */}
                    {isImage ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resource.url}
                          alt={resource.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/50">
                        <ResIcon className={cn('h-5 w-5', resColor)} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">
                        {resource.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(resource.size)}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(resource)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Component: BoardWorkspace
// ═══════════════════════════════════════════════════════════════════

export function BoardWorkspace() {
  const {
    user,
    currentTeam,
    currentBoard,
    currentFile,
    boardFiles,
    storyElements,
    resources,
    sidebarOpen,
    resourcePanelOpen,
    setBoardFiles,
    setCurrentFile,
    setStoryElements,
    setResources,
    setSidebarOpen,
    setResourcePanelOpen,
    pageBg,
    setPageBg,
    darkMode,
    setDarkMode,
    setView,
  } = useAppStore()

  const isMobile = useIsMobile()

  // ── Redirect if no board selected ──
  useEffect(() => {
    if (!currentBoard) {
      setView('dashboard')
    }
  }, [currentBoard, setView])

  // ── Local State ──
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [childrenCache, setChildrenCache] = useState<Record<string, BoardFile[]>>({})
  const childrenCacheRef = useRef(childrenCache)
  childrenCacheRef.current = childrenCache

  // Dialog states
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [createName, setCreateName] = useState('')
  const [createType, setCreateType] = useState<BoardFile['type']>('planning')
  const [createParentId, setCreateParentId] = useState<string | undefined>()
  const [targetFile, setTargetFile] = useState<BoardFile | null>(null)

  // Sheet state for mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // ── Computed ──
  const rootFiles = boardFiles
    .filter((f) => !f.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const currentFileChildren = currentFile?.type === 'folder'
    ? (childrenCache[currentFile.id] || [])
    : []

  // ── API: Load Files ──
  const loadFiles = useCallback(async () => {
    if (!currentBoard) return
    try {
      const res = await fetch(`/api/boards/files?boardId=${encodeURIComponent(currentBoard.id)}`)
      if (res.ok) {
        const data = await res.json()
        setBoardFiles(data.files ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [currentBoard, setBoardFiles])

  // ── API: Load Children for a folder ──
  const loadChildren = useCallback(async (folderId: string, force = false) => {
    if (!currentBoard) return
    if (!force && childrenCacheRef.current[folderId]) return
    try {
      const res = await fetch(
        `/api/boards/files?boardId=${encodeURIComponent(currentBoard.id)}&parentId=${encodeURIComponent(folderId)}`
      )
      if (res.ok) {
        const data = await res.json()
        setChildrenCache((prev) => ({ ...prev, [folderId]: data.files ?? [] }))
      }
    } catch {
      // Silently fail
    }
  }, [currentBoard])

  // ── API: Load Resources ──
  const loadResources = useCallback(async () => {
    if (!currentBoard) return
    try {
      const res = await fetch(`/api/boards/resources?boardId=${encodeURIComponent(currentBoard.id)}`)
      if (res.ok) {
        const data = await res.json()
        setResources(data.resources ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [currentBoard, setResources])

  // ── API: Load Story Elements ──
  const loadElements = useCallback(async () => {
    if (!currentBoard) return
    try {
      const res = await fetch(`/api/boards/elements?boardId=${encodeURIComponent(currentBoard.id)}`)
      if (res.ok) {
        const data = await res.json()
        setStoryElements(data.elements ?? [])
      }
    } catch {
      // Silently fail
    }
  }, [currentBoard, setStoryElements])

  // ── Init ──
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadFiles(), loadResources(), loadElements()])
      setLoading(false)
    }
    if (currentBoard) {
      init()
    }
  }, [currentBoard, loadFiles, loadResources, loadElements])

  // ── Handlers ──

  // Toggle folder
  const handleToggleFolder = useCallback(
    (fileId: string) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        if (next.has(fileId)) {
          next.delete(fileId)
        } else {
          next.add(fileId)
        }
        return next
      })
    },
    []
  )

  // Load children when a folder is expanded
  useEffect(() => {
    expandedFolders.forEach((folderId) => {
      if (!childrenCache[folderId]) {
        loadChildren(folderId)
      }
    })
  }, [expandedFolders, childrenCache, loadChildren])

  // Select file
  const handleSelectFile = useCallback(
    (file: BoardFile) => {
      setCurrentFile(file)
      // If folder, expand it
      if (file.type === 'folder') {
        setExpandedFolders((prev) => {
          const next = new Set(prev)
          next.add(file.id)
          return next
        })
      }
      // Close mobile sidebar
      if (isMobile) {
        setMobileSidebarOpen(false)
      }
    },
    [setCurrentFile, isMobile]
  )

  // Open create dialog
  const handleOpenCreate = useCallback(
    (type: BoardFile['type'], parentId?: string) => {
      const config = FILE_TYPE_CONFIG[type]
      setCreateType(type)
      setCreateParentId(parentId)
      setCreateName('')
      setCreateOpen(true)
      // Pre-fill name if not custom
      if (!parentId) {
        setCreateName(`未命名${config.label}`)
      } else {
        setCreateName(`未命名${config.label}`)
      }
    },
    []
  )

  // Create file
  const handleCreateFile = async () => {
    if (!currentBoard || !createName.trim()) {
      toast.error('请输入文件名称')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/boards/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: currentBoard.id,
          parentId: createParentId || null,
          name: createName.trim(),
          type: createType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '创建文件失败')
        return
      }
      toast.success(`${FILE_TYPE_CONFIG[createType].label}已创建`)
      setCreateOpen(false)
      await loadFiles()
      // If created inside a folder, force refresh its children
      if (createParentId) {
        await loadChildren(createParentId, true)
      }
      // Auto-select the new file
      if (data.file) {
        setCurrentFile(data.file)
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Open rename dialog
  const handleOpenRename = useCallback((file: BoardFile) => {
    setTargetFile(file)
    setRenameValue(file.name)
    setRenameOpen(true)
  }, [])

  // Rename file
  const handleRenameFile = async () => {
    if (!targetFile || !renameValue.trim()) {
      toast.error('请输入文件名称')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/boards/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: targetFile.id, name: renameValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '重命名失败')
        return
      }
      toast.success('已重命名')
      setRenameOpen(false)
      setTargetFile(null)
      await loadFiles()
      // Update currentFile if it was renamed
      if (currentFile?.id === targetFile.id) {
        setCurrentFile({ ...currentFile, name: renameValue.trim() })
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Open delete dialog
  const handleOpenDelete = useCallback((file: BoardFile) => {
    setTargetFile(file)
    setDeleteOpen(true)
  }, [])

  // Delete file
  const handleDeleteFile = async () => {
    if (!targetFile) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/boards/files?fileId=${encodeURIComponent(targetFile.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除失败')
        return
      }
      toast.success('已删除')
      setDeleteOpen(false)
      // If deleting current file, clear selection
      if (currentFile?.id === targetFile.id) {
        setCurrentFile(null)
      }
      // If deleting a folder, clear its children cache
      if (targetFile.type === 'folder') {
        setChildrenCache((prev) => {
          const next = { ...prev }
          delete next[targetFile.id]
          return next
        })
      }
      // If the deleted file had a parent, refresh parent's children
      if (targetFile.parentId) {
        await loadChildren(targetFile.parentId, true)
      }
      setTargetFile(null)
      await loadFiles()
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Upload resources
  const handleUploadResources = async (files: FileList) => {
    if (!currentBoard) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('resource', 'true')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(`${file.name}: ${data.error || '上传失败'}`)
          continue
        }

        const saveRes = await fetch('/api/boards/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId: currentBoard.id,
            fileId: currentFile && currentFile.type !== 'folder' ? currentFile.id : null,
            name: data.originalName || file.name,
            type: data.format || file.type,
            url: data.url,
            originalUrl: data.originalUrl || null,
            size: data.size || file.size,
            mimeType: data.mimeType || file.type,
          }),
        })
        if (!saveRes.ok) {
          toast.error(`${file.name}: 保存资源记录失败`)
        }
      }
      toast.success('资源上传完成')
      await loadResources()
    } catch {
      toast.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  // Delete resource
  const handleDeleteResource = async (resource: Resource) => {
    try {
      const res = await fetch(`/api/boards/resources?resourceId=${encodeURIComponent(resource.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除资源失败')
        return
      }
      toast.success('资源已删除')
      await loadResources()
    } catch {
      toast.error('网络错误')
    }
  }

  // Back to dashboard
  const handleBack = useCallback(() => {
    setView('dashboard')
  }, [setView])

  // Toggle .dark class based on darkMode or black background
  useEffect(() => {
    const root = document.documentElement
    if (pageBg === 'black' || darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [pageBg, darkMode])

  const handleSetPageBg = useCallback((bg: string) => {
    setPageBg(bg)
  }, [setPageBg])

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
  }, [darkMode, setDarkMode])

  // 根据当前背景色和深色模式状态计算最终背景色的帮助函数
  const getBgColorWithDarkMode = (bg: string, isDark: boolean): string => {
    if (!isDark || bg === 'black') {
      return getPageBgColor(bg)
    }
    // 深色模式下，将浅色调配成深色调
    const darkColorMap: Record<string, string> = {
      'white': '#171717',
      'blue': '#1e293b',
      'green': '#14532d',
      'yellow': '#422006'
    }
    return darkColorMap[bg] || '#171717'
  }

  // ── Loading State ──
  if (!currentBoard) {
    const isLoadingDark = pageBg === 'black' || darkMode
    const loadingBg = getBgColorWithDarkMode(pageBg, isLoadingDark)
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: loadingBg }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={cn('h-6 w-6 animate-spin', isLoadingDark ? 'text-gray-400' : 'text-muted-foreground')} />
          <p className={cn('text-sm', isLoadingDark ? 'text-gray-400' : 'text-muted-foreground')}>正在返回仪表盘…</p>
        </div>
      </div>
    )
  }

  if (loading) {
    const isLoadingDark = pageBg === 'black' || darkMode
    const loadingBg = getBgColorWithDarkMode(pageBg, isLoadingDark)
    return (
      <div className="flex h-screen flex-col" style={{ backgroundColor: loadingBg }}>
        {/* Header skeleton */}
        <header className={cn(
          'flex items-center gap-3 border-b px-4 py-3 md:px-6',
          isLoadingDark ? 'border-gray-800' : 'border-gray-100'
        )} style={{ backgroundColor: loadingBg }}>
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </header>
        {/* Body skeleton */}
        <div className="flex flex-1 overflow-hidden">
          <div className={cn(
            'w-[240px] shrink-0 border-r p-3 space-y-2',
            isLoadingDark ? 'border-gray-800' : 'border-gray-100'
          )} style={{ backgroundColor: loadingBg }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className={cn('h-8 w-8 animate-spin', isLoadingDark ? 'text-gray-400' : 'text-muted-foreground')} />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  const isDarkBg = pageBg === 'black' || darkMode
  const bgColor = getBgColorWithDarkMode(pageBg, isDarkBg)

  // ═══════════════════════════════════════════════════════════════
  // Sidebar Content (shared between desktop & mobile)
  // ═══════════════════════════════════════════════════════════════
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-1.5">
          <Film className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">文件管理</span>
        </div>
        <NewFileButton onCreate={handleOpenCreate} disabled={submitting} />
      </div>

      <Separator />

      {/* File Tree */}
      <ScrollArea className="flex-1 px-1 py-2">
        <div className="space-y-0.5">
          {rootFiles.map((file) => {
            const children = file.type === 'folder'
              ? (childrenCache[file.id] || [])
              : []
            return (
              <FileTreeItemMemo
                key={file.id}
                file={file}
                depth={0}
                currentFile={currentFile}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onSelectFile={handleSelectFile}
                onRename={handleOpenRename}
                onDelete={handleOpenDelete}
                childrenFiles={children}
              />
            )
          })}
        </div>

        {rootFiles.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
              <Folder className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">暂无文件</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                点击 + 创建第一个文件
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Sidebar Footer */}
      <Separator />
      <div className="px-3 py-2">
        <p className="text-[10px] text-muted-foreground/60 text-center">
          {boardFiles.length} 个文件
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: bgColor }}>
      {/* ─── Header ─── */}
      <header className={cn(
        'flex items-center gap-3 px-3 py-2.5 md:px-4 border-b',
        isDarkBg ? 'border-gray-800' : 'border-gray-100'
      )} style={{ backgroundColor: bgColor }}>
        {/* Back button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>返回仪表盘</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Board name */}
        <div className="flex min-w-0 items-center gap-2">
          {isMobile ? (
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0" style={{ backgroundColor: bgColor }}>
                <SheetHeader className="sr-only">
                  <SheetTitle>文件管理</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
          ) : (
            // Desktop sidebar toggle
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sidebarOpen ? '收起侧栏' : '展开侧栏'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">
              {currentBoard.name}
            </h1>
            {currentTeam && (
              <p className="truncate text-[11px] text-muted-foreground leading-tight">
                {currentTeam.icon} {currentTeam.name}
              </p>
            )}
          </div>
        </div>

        {/* File name indicator */}
        {currentFile && currentFile.type !== 'folder' && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <Separator orientation="vertical" className="mx-1 h-4" />
            {(() => {
              const config = FILE_TYPE_CONFIG[currentFile.type]
              if (!config) return null
              const Icon = config.icon
              return (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className={cn('h-3.5 w-3.5', config.color)} />
                  <span className="truncate max-w-[200px]">{currentFile.name}</span>
                </div>
              )
            })()}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Background color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium px-2 pb-1">页面背景</p>
                <div className="flex gap-1">
                  {PAGE_BG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'relative h-7 w-7 rounded-md border-2 transition-all flex items-center justify-center',
                        pageBg === opt.value
                          ? 'border-gray-400 scale-110'
                          : 'border-transparent hover:border-gray-200'
                      )}
                      style={{ backgroundColor: opt.color }}
                      onClick={() => handleSetPageBg(opt.value)}
                      title={opt.label}
                    >
                      {pageBg === opt.value && (
                        <Check className={cn('h-3.5 w-3.5', opt.dark ? 'text-gray-300' : 'text-gray-600')} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Dark mode toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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

          {/* Resource panel toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={resourcePanelOpen ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setResourcePanelOpen(!resourcePanelOpen)}
                >
                  {resourcePanelOpen ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {resourcePanelOpen ? '关闭资源库' : '打开资源库'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User avatar */}
          <div className="ml-1 hidden items-center sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user?.name?.charAt(0) || '?'}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && sidebarOpen && (
          <aside className="w-[240px] shrink-0 border-r transition-all duration-200" style={{ backgroundColor: bgColor, borderColor: isDarkBg ? '#1f2937' : '#e5e7eb' }}>
            {sidebarContent}
          </aside>
        )}

        {/* Main Editor Area */}
        <main className="flex-1 overflow-hidden" style={{ backgroundColor: bgColor }}>
          <EditorArea file={currentFile} boardId={currentBoard.id} />
        </main>

        {/* Resource Panel */}
        {resourcePanelOpen && !isMobile && (
          <aside className="w-[280px] shrink-0 border-l transition-all duration-200" style={{ backgroundColor: bgColor, borderColor: isDarkBg ? '#1f2937' : '#e5e7eb' }}>
            <ResourcePanel
              boardId={currentBoard.id}
              resources={resources}
              onUpload={handleUploadResources}
              onDelete={handleDeleteResource}
              uploading={uploading}
            />
          </aside>
        )}

        {/* Mobile resource panel via Sheet */}
        {isMobile && (
          <>
            <Sheet
              open={resourcePanelOpen}
              onOpenChange={setResourcePanelOpen}
            >
              <SheetContent side="right" className="w-[300px] p-0" style={{ backgroundColor: bgColor }}>
                <SheetHeader className="sr-only">
                  <SheetTitle>资源库</SheetTitle>
                </SheetHeader>
                <ResourcePanel
                  boardId={currentBoard.id}
                  resources={resources}
                  onUpload={handleUploadResources}
                  onDelete={handleDeleteResource}
                  uploading={uploading}
                />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* ═══════ Dialogs ═══════ */}

      {/* Create File Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              新建{FILE_TYPE_CONFIG[createType]?.label || '文件'}
            </DialogTitle>
            <DialogDescription>
              为新的{FILE_TYPE_CONFIG[createType]?.label || '文件'}命名
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>文件类型</Label>
              <div className="flex flex-wrap gap-2">
                {CREATABLE_TYPES.map((type) => {
                  const config = FILE_TYPE_CONFIG[type]
                  const Icon = config.icon
                  const isSelected = type === createType
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setCreateType(type)
                        setCreateName(`未命名${config.label}`)
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', isSelected ? '' : config.color)} />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-file-name">文件名称</Label>
              <Input
                id="create-file-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleCreateFile} disabled={submitting || !createName.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
            <DialogDescription>修改文件名称</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-file-name">文件名称</Label>
              <Input
                id="rename-file-name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleRenameFile} disabled={submitting || !renameValue.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文件</DialogTitle>
            <DialogDescription>
              确定要删除「{targetFile?.name}」吗？{targetFile?.type === 'folder' ? '文件夹内的所有内容也将被删除。' : ''}此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  )
}
