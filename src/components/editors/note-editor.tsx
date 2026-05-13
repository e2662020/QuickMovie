'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore, type BoardFile } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

import {
  Plus,
  X,
  Columns,
  Eye,
  Edit,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Link,
  Image as ImageIcon,
  Code,
  Quote,
  Minus,
  Save,
  GripVertical,
  FileText,
  Loader2,
} from 'lucide-react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface NoteColumn {
  id: string
  title: string
  content: string
}

interface NoteData {
  columns: NoteColumn[]
}

type ViewMode = 'edit' | 'preview' | 'split'

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const MAX_COLUMNS = 4
const AUTO_SAVE_DELAY = 1500

const DEFAULT_COLUMN: NoteColumn = {
  id: crypto.randomUUID(),
  title: '笔记 1',
  content: '',
}

const DEFAULT_DATA: NoteData = {
  columns: [{ ...DEFAULT_COLUMN }],
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function parseNoteContent(content: string | undefined): NoteData {
  if (!content) return { columns: [{ ...DEFAULT_COLUMN }] }
  try {
    const parsed = JSON.parse(content)
    if (parsed.columns && Array.isArray(parsed.columns) && parsed.columns.length > 0) {
      return {
        columns: parsed.columns.map(
          (col: Partial<NoteColumn>, i: number) => ({
            id: col.id || crypto.randomUUID(),
            title: col.title || `笔记 ${i + 1}`,
            content: col.content || '',
          })
        ),
      }
    }
  } catch {
    // If content is not valid JSON, treat it as a single column
    return {
      columns: [{ id: crypto.randomUUID(), title: '笔记 1', content: content || '' }],
    }
  }
  return { columns: [{ ...DEFAULT_COLUMN }] }
}

function generateId(): string {
  return crypto.randomUUID()
}

// ═══════════════════════════════════════════════════════════════════
// Markdown Toolbar
// ═══════════════════════════════════════════════════════════════════

interface ToolbarAction {
  icon: React.ReactNode
  label: string
  action: (textarea: HTMLTextAreaElement) => void
}

function getToolbarActions(): ToolbarAction[] {
  return [
    {
      icon: <Bold className="h-3.5 w-3.5" />,
      label: '粗体',
      action: wrapSelection('**', '**'),
    },
    {
      icon: <Italic className="h-3.5 w-3.5" />,
      label: '斜体',
      action: wrapSelection('*', '*'),
    },
    {
      icon: <Heading1 className="h-3.5 w-3.5" />,
      label: '标题 1',
      action: prependLine('# '),
    },
    {
      icon: <Heading2 className="h-3.5 w-3.5" />,
      label: '标题 2',
      action: prependLine('## '),
    },
    {
      icon: <List className="h-3.5 w-3.5" />,
      label: '列表',
      action: prependLine('- '),
    },
    {
      icon: <Link className="h-3.5 w-3.5" />,
      label: '链接',
      action: wrapSelection('[', '](url)'),
    },
    {
      icon: <ImageIcon className="h-3.5 w-3.5" />,
      label: '图片',
      action: prependLine('![alt](url)'),
    },
    {
      icon: <Code className="h-3.5 w-3.5" />,
      label: '代码块',
      action: wrapSelection('```\n', '\n```'),
    },
    {
      icon: <Quote className="h-3.5 w-3.5" />,
      label: '引用',
      action: prependLine('> '),
    },
    {
      icon: <Minus className="h-3.5 w-3.5" />,
      label: '分割线',
      action: () => insertAtLine('\n---\n'),
    },
  ]
}

function wrapSelection(before: string, after: string) {
  return (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const replacement = `${before}${selectedText || 'text'}${after}`
    const newValue =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end)

    // We use a synthetic event approach - dispatch input event
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )!.set!
    nativeInputValueSetter.call(textarea, newValue)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    // Set cursor position
    requestAnimationFrame(() => {
      textarea.focus()
      if (selectedText) {
        textarea.selectionStart = start + before.length
        textarea.selectionEnd = start + before.length + selectedText.length
      } else {
        textarea.selectionStart = start + before.length
        textarea.selectionEnd = start + before.length + 4
      }
    })
  }
}

function prependLine(prefix: string) {
  return (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart
    const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1
    const newValue =
      textarea.value.substring(0, lineStart) +
      prefix +
      textarea.value.substring(lineStart)

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )!.set!
    nativeInputValueSetter.call(textarea, newValue)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = lineStart + prefix.length
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    })
  }
}

function insertAtLine(text: string) {
  return (textarea: HTMLTextAreaElement) => {
    const pos = textarea.selectionStart
    const newValue =
      textarea.value.substring(0, pos) +
      text +
      textarea.value.substring(textarea.selectionEnd)

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )!.set!
    nativeInputValueSetter.call(textarea, newValue)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = pos + text.length
      textarea.selectionEnd = pos + text.length
    })
  }
}

// ═══════════════════════════════════════════════════════════════════
// Markdown Preview
// ═══════════════════════════════════════════════════════════════════

function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground/50">输入 Markdown 内容以预览</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="prose prose-sm prose-neutral dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
        prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
        prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
        prose-p:leading-relaxed prose-p:my-2
        prose-li:my-0.5
        prose-blockquote:border-l-primary/40 prose-blockquote:not-italic
        prose-pre:bg-transparent prose-pre:p-0
        prose-code:before:content-none prose-code:after:content-none
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-md prose-img:my-3
        prose-table:text-xs
        prose-th:text-left prose-th:font-semibold prose-th:px-3 prose-th:py-1.5 prose-th:border-b
        prose-td:px-3 prose-td:py-1.5 prose-td:border-b prose-td:border-border
        prose-hr:my-4"
    >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match && !className

          if (isInline) {
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            )
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : 'text'}
              PreTag="div"
              className="rounded-md !my-3 text-xs"
              showLineNumbers={false}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        },
        // Ensure links open in new tab
        a({ children, ...props }) {
          return (
            <a target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Note Column Component
// ═══════════════════════════════════════════════════════════════════

interface NoteColumnEditorProps {
  column: NoteColumn
  viewMode: ViewMode
  onUpdate: (id: string, updates: Partial<NoteColumn>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  index: number
}

function NoteColumnEditor({
  column,
  viewMode,
  onUpdate,
  onRemove,
  onCycleViewMode,
  canRemove,
  index,
}: NoteColumnEditorProps & {
  onCycleViewMode: (id: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [localContent, setLocalContent] = useState(column.content)
  const [editingTitle, setEditingTitle] = useState(false)

  // Sync local content when column changes externally
  const prevColumnIdRef = useRef(column.id)
  useEffect(() => {
    if (prevColumnIdRef.current !== column.id) {
      prevColumnIdRef.current = column.id
      setLocalContent(column.content) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [column.id, column.content]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setLocalContent(newContent)
      onUpdate(column.id, { content: newContent })
    },
    [column.id, onUpdate]
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(column.id, { title: e.target.value })
    },
    [column.id, onUpdate]
  )

  const handleToolbarAction = useCallback(
    (action: (textarea: HTMLTextAreaElement) => void) => {
      if (textareaRef.current) {
        action(textareaRef.current)
        // Read the value after the action
        const newValue = textareaRef.current.value
        setLocalContent(newValue)
        onUpdate(column.id, { content: newValue })
      }
    },
    [column.id, onUpdate]
  )

  const toolbarActions = useMemo(() => getToolbarActions(), [])

  return (
    <div className="flex h-full flex-col min-w-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/20">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={column.title}
              onChange={handleTitleChange}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingTitle(false)
              }}
              className="text-xs font-semibold bg-transparent border-b border-primary outline-none w-full min-w-0 truncate"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-xs font-semibold hover:text-primary transition-colors truncate max-w-[140px]"
              title="点击编辑标题"
            >
              {column.title}
            </button>
          )}
          <span className="text-[10px] text-muted-foreground/60 shrink-0">#{index + 1}</span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onCycleViewMode(column.id)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">编辑模式</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onCycleViewMode(column.id)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">预览模式</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Close button */}
        {canRemove && (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(column.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">关闭此列</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Toolbar */}
      {(viewMode === 'edit' || viewMode === 'split') && (
        <div className="flex items-center gap-0.5 border-b px-2 py-1.5 bg-background overflow-x-auto">
          <Separator orientation="vertical" className="h-4 mx-1 shrink-0" />
          {toolbarActions.map((action) => (
            <TooltipProvider key={action.label} delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleToolbarAction(action.action)}
                  >
                    {action.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {action.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}

      {/* Editor / Preview Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' ? (
          <div className="flex h-full">
            {/* Editor pane */}
            <div className="flex-1 border-r overflow-hidden">
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={handleContentChange}
                className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
                placeholder="在此输入 Markdown 内容..."
                spellCheck={false}
              />
            </div>
            {/* Preview pane */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <MarkdownPreview content={column.content} />
              </div>
            </ScrollArea>
          </div>
        ) : viewMode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
            placeholder="在此输入 Markdown 内容..."
            spellCheck={false}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4">
              <MarkdownPreview content={column.content} />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export function NoteEditor() {
  const { currentFile, setCurrentFile, token } = useAppStore()

  // ── Local State ──
  const [columns, setColumns] = useState<NoteColumn[]>([])
  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({})
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef(false)

  // ── Initialize from file content ──
  useEffect(() => {
    if (currentFile) {
      const data = parseNoteContent(currentFile.content)
      setColumns(data.columns)
      // Initialize view modes
      const modes: Record<string, ViewMode> = {}
      data.columns.forEach((col) => {
        modes[col.id] = 'split'
      })
      setViewModes(modes)
      setDirty(false)
    }
  }, [currentFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save with debounce ──
  useEffect(() => {
    if (!dirty || !currentFile) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    pendingSaveRef.current = true
    autoSaveTimerRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        handleSave(false)
      }
    }, AUTO_SAVE_DELAY)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [columns]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handler ──
  const handleSave = useCallback(
    async (showToast = true) => {
      if (!currentFile) return

      setSaving(true)
      pendingSaveRef.current = false

      try {
        const data: NoteData = { columns }
        const res = await fetch('/api/boards/files', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fileId: currentFile.id,
            content: JSON.stringify(data),
          }),
        })

        const result = await res.json()
        if (!res.ok) {
          toast.error(result.error || '保存失败')
          return
        }

        setDirty(false)
        setLastSavedAt(new Date())

        if (result.file) {
          setCurrentFile({ ...currentFile, content: result.file.content })
        } else {
          setCurrentFile({ ...currentFile, content: JSON.stringify(data) })
        }

        if (showToast) {
          toast.success('笔记已保存')
        }
      } catch {
        toast.error('网络错误，请稍后重试')
      } finally {
        setSaving(false)
      }
    },
    [currentFile, columns, token, setCurrentFile]
  )

  // ── Column Operations ──
  const addColumn = useCallback(() => {
    if (columns.length >= MAX_COLUMNS) {
      toast.warning(`最多支持 ${MAX_COLUMNS} 列`)
      return
    }
    const newColumn: NoteColumn = {
      id: generateId(),
      title: `笔记 ${columns.length + 1}`,
      content: '',
    }
    setColumns((prev) => [...prev, newColumn])
    setViewModes((prev) => ({ ...prev, [newColumn.id]: 'split' }))
    setDirty(true)
  }, [columns.length])

  const removeColumn = useCallback(
    (id: string) => {
      if (columns.length <= 1) return
      setColumns((prev) => prev.filter((col) => col.id !== id))
      setViewModes((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDirty(true)
    },
    [columns.length]
  )

  const updateColumn = useCallback(
    (id: string, updates: Partial<NoteColumn>) => {
      setColumns((prev) =>
        prev.map((col) => (col.id === id ? { ...col, ...updates } : col))
      )
      setDirty(true)
    },
    []
  )

  const cycleViewMode = useCallback(
    (id: string) => {
      setViewModes((prev) => {
        const current = prev[id] || 'split'
        const next: ViewMode = current === 'edit' ? 'split' : current === 'split' ? 'preview' : 'edit'
        return { ...prev, [id]: next }
      })
    },
    []
  )

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // ── No file guard ──
  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">请选择一个笔记文件</p>
        </div>
      </div>
    )
  }

  // ── Build resizable panels ──
  const panelElements = columns.map((column, index) => (
    <React.Fragment key={column.id}>
      {index > 0 && (
        <ResizableHandle withHandle className="bg-border/60 hover:bg-primary/20 transition-colors">
          <div className="z-10 flex items-center justify-center">
            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
          </div>
        </ResizableHandle>
      )}
      <ResizablePanel
        minSize={20}
        defaultSize={Math.floor(100 / columns.length)}
      >
        <NoteColumnEditor
          column={column}
          viewMode={viewModes[column.id] || 'split'}
          onUpdate={(id, updates) => {
            updateColumn(id, updates)
          }}
          onRemove={removeColumn}
          onCycleViewMode={cycleViewMode}
          canRemove={columns.length > 1}
          index={index}
        />
      </ResizablePanel>
    </React.Fragment>
  ))

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-emerald-500" />
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
              {currentFile.name}
            </h2>
          </div>

          {dirty && (
            <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              未保存
            </span>
          )}
          {!dirty && lastSavedAt && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              已保存于{' '}
              {lastSavedAt.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Column count */}
          <div className="flex items-center gap-1.5 mr-1">
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={addColumn}
                    disabled={columns.length >= MAX_COLUMNS}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span>{columns.length}/{MAX_COLUMNS}</span>
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {columns.length >= MAX_COLUMNS
                    ? '已达到最大列数'
                    : '添加新列'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* View mode switcher (global) */}
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const currentMode = viewModes[columns[0]?.id] || 'split'
                    const nextMode: ViewMode =
                      currentMode === 'edit' ? 'split' : currentMode === 'split' ? 'preview' : 'edit'
                    setViewModes((prev) => {
                      const next = { ...prev }
                      columns.forEach((col) => {
                        next[col.id] = nextMode
                      })
                      return next
                    })
                  }}
                >
                  {(() => {
                    const mode = viewModes[columns[0]?.id] || 'split'
                    if (mode === 'edit') return <Edit className="h-3.5 w-3.5" />
                    if (mode === 'preview') return <Eye className="h-3.5 w-3.5" />
                    return (
                      <div className="flex items-center gap-0.5">
                        <Edit className="h-3 w-3" />
                        <Separator orientation="vertical" className="h-3" />
                        <Eye className="h-3 w-3" />
                      </div>
                    )
                  })()}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                切换视图模式
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-5" />

          {/* Save button */}
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={dirty ? 'default' : 'ghost'}
                  className="h-8 gap-1.5"
                  onClick={() => handleSave(true)}
                  disabled={saving || !dirty}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">保存</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                保存笔记 (Ctrl+S)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ─── Columns Area ─── */}
      <div className="flex-1 overflow-hidden">
        {columns.length === 1 ? (
          // Single column: no need for resizable
          <NoteColumnEditor
            column={columns[0]}
            viewMode={viewModes[columns[0].id] || 'split'}
            onUpdate={(id, updates) => updateColumn(id, updates)}
            onRemove={removeColumn}
            onCycleViewMode={cycleViewMode}
            canRemove={false}
            index={0}
          />
        ) : (
          // Multi-column: resizable layout
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full"
          >
            {panelElements}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}
