'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
  Columns,
  Save,
  GripVertical,
  FileText,
  Loader2,
  X,
} from 'lucide-react'

import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  tablePlugin,
  linkDialogPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  InsertTable,
  InsertCodeBlock,
  InsertThematicBreak,
  StrikeThroughSupSubToggles,
  CodeToggle,
  Separator as ToolbarSeparator,
  DiffSourceToggleWrapper,
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface NoteColumn {
  id: string
  title: string
  content: string
}

interface NoteData {
  columns: NoteColumn[]
}

const MAX_COLUMNS = 4
const AUTO_SAVE_DELAY = 1500

const DEFAULT_COLUMN: NoteColumn = {
  id: crypto.randomUUID(),
  title: '笔记 1',
  content: '',
}

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
    return {
      columns: [{ id: crypto.randomUUID(), title: '笔记 1', content: content || '' }],
    }
  }
  return { columns: [{ ...DEFAULT_COLUMN }] }
}

function generateId(): string {
  return crypto.randomUUID()
}

const mdxPlugins = [
  headingsPlugin(),
  listsPlugin(),
  linkPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      js: 'JavaScript',
      ts: 'TypeScript',
      tsx: 'TypeScript JSX',
      jsx: 'JavaScript JSX',
      python: 'Python',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      bash: 'Bash',
      sql: 'SQL',
      markdown: 'Markdown',
      txt: 'Plain Text',
    },
  }),
  tablePlugin(),
  linkDialogPlugin(),
  diffSourcePlugin({ viewMode: 'rich-text' }),
  toolbarPlugin({
    toolbarContents: () => (
      <DiffSourceToggleWrapper options={['rich-text', 'source']}>
        <UndoRedo />
        <ToolbarSeparator />
        <BoldItalicUnderlineToggles />
        <StrikeThroughSupSubToggles />
        <CodeToggle />
        <ToolbarSeparator />
        <BlockTypeSelect />
        <ListsToggle />
        <ToolbarSeparator />
        <CreateLink />
        <InsertTable />
        <InsertCodeBlock />
        <InsertThematicBreak />
      </DiffSourceToggleWrapper>
    ),
  }),
]

interface NoteColumnEditorProps {
  column: NoteColumn
  onUpdate: (id: string, updates: Partial<NoteColumn>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  index: number
  fileKey: string
}

const NoteColumnEditor = React.memo(function NoteColumnEditor({
  column,
  onUpdate,
  onRemove,
  canRemove,
  index,
  fileKey,
}: NoteColumnEditorProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const editorRef = useRef<MDXEditorMethods>(null)

  const handleEditorChange = useCallback(
    (markdown: string) => {
      onUpdate(column.id, { content: markdown })
    },
    [column.id, onUpdate]
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate(column.id, { title: e.target.value })
    },
    [column.id, onUpdate]
  )

  return (
    <div className="flex h-full flex-col min-w-0">
      <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/20">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingTitle ? (
            <input
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

      <div className="flex-1 overflow-hidden mdxeditor-wrapper">
        <MDXEditor
          key={`${column.id}-${fileKey}`}
          ref={editorRef}
          markdown={column.content}
          onChange={handleEditorChange}
          contentEditableClassName="prose prose-sm prose-neutral dark:prose-invert max-w-none px-6 py-4 outline-none min-h-full"
          plugins={mdxPlugins}
          placeholder="在此输入 Markdown 内容..."
          spellCheck={false}
        />
      </div>
    </div>
  )
})

export function NoteEditor() {
  const { currentFile } = useAppStore()

  const [columns, setColumns] = useState<NoteColumn[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef(false)

  useEffect(() => {
    if (currentFile) {
      const data = parseNoteContent(currentFile.content)
      setColumns(data.columns)
      setDirty(false)
    }
  }, [currentFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

        if (showToast) {
          toast.success('笔记已保存')
        }
      } catch {
        toast.error('网络错误，请稍后重试')
      } finally {
        setSaving(false)
      }
    },
    [currentFile, columns]
  )

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
    setDirty(true)
  }, [columns.length])

  const removeColumn = useCallback(
    (id: string) => {
      if (columns.length <= 1) return
      setColumns((prev) => prev.filter((col) => col.id !== id))
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

  const fileKey = currentFile.id

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
          onUpdate={updateColumn}
          onRemove={removeColumn}
          canRemove={columns.length > 1}
          index={index}
          fileKey={fileKey}
        />
      </ResizablePanel>
    </React.Fragment>
  ))

  return (
    <div className="flex h-full flex-col">
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
                  {columns.length >= MAX_COLUMNS ? '已达到最大列数' : '添加新列'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="h-5" />

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
              <TooltipContent side="bottom">保存笔记 (Ctrl+S)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {columns.length === 1 ? (
          <NoteColumnEditor
            column={columns[0]}
            onUpdate={updateColumn}
            onRemove={removeColumn}
            canRemove={false}
            index={0}
            fileKey={fileKey}
          />
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {panelElements}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}
