'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore, type StoryElement } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  Command,
  CommandList,
  CommandItem,
  CommandInput,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Save,
  Bold,
  Type,
  Plus,
  Trash2,
  Film,
  Users,
  MapPin,
  Keyboard,
  ChevronDown,
  Sparkles,
  Clock,
  Hash,
  Clapperboard,
} from 'lucide-react'

export type BlockType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'

export interface ScriptBlock {
  id: string
  type: BlockType
  content: string
  linkedElementId?: string
}

export interface ScriptData {
  title: string
  writer: string
  version: string
  blocks: ScriptBlock[]
}

const BLOCK_TYPES: {
  value: BlockType
  label: string
  description: string
  icon: React.ReactNode
  shortcut: string
}[] = [
  {
    value: 'scene_heading',
    label: '场景标题',
    description: '新场景的开始，如：场景一 - 室内 - 白天',
    icon: <MapPin className="h-4 w-4" />,
    shortcut: 'Ctrl+Shift+1',
  },
  {
    value: 'action',
    label: '动作描述',
    description: '描述场景中发生的事情和角色动作',
    icon: <Film className="h-4 w-4" />,
    shortcut: 'Ctrl+Shift+2',
  },
  {
    value: 'character',
    label: '角色名',
    description: '说话角色的名字',
    icon: <Users className="h-4 w-4" />,
    shortcut: 'Ctrl+Shift+3',
  },
  {
    value: 'dialogue',
    label: '对话',
    description: '角色的台词内容',
    icon: <Type className="h-4 w-4" />,
    shortcut: 'Ctrl+Shift+4',
  },]

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  scene_heading: '场景',
  action: '动作',
  character: '角色',
  dialogue: '对话',
}

const BLOCK_TYPE_CYCLE: BlockType[] = [
  'scene_heading',
  'action',
  'character',
  'dialogue',
]


const SCENE_HEADING_TEMPLATE = '场景 - 内景/外景 - 时间'

const DEFAULT_SCRIPT: ScriptData = {
  title: '',
  writer: '',
  version: '第一稿',
  blocks: [
    {
      id: 'default-1',
      type: 'scene_heading',
      content: SCENE_HEADING_TEMPLATE,
    },
    {
      id: 'default-2',
      type: 'action',
      content: '在这里开始写作你的剧本...',
    },
  ],
}

type PageBg = 'white' | 'black' | 'blue' | 'green' | 'yellow'

const PAGE_BG_OPTIONS: { value: PageBg; label: string; color: string; dark: boolean }[] = [
  { value: 'white', label: '白色', color: '#ffffff', dark: false },
  { value: 'black', label: '黑色', color: '#1a1a1a', dark: true },
  { value: 'blue', label: '淡蓝', color: '#eef6fc', dark: false },
  { value: 'green', label: '淡绿', color: '#edf7ed', dark: false },
  { value: 'yellow', label: '淡黄', color: '#fef9e7', dark: false },
]

function generateId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseScriptContent(content: string | undefined): ScriptData {
  if (!content) return { ...DEFAULT_SCRIPT, blocks: DEFAULT_SCRIPT.blocks.map((b) => ({ ...b })) }
  try {
    const parsed = JSON.parse(content)
    return {
      title: parsed.title || '',
      writer: parsed.writer || '',
      version: parsed.version || '第一稿',
      blocks: Array.isArray(parsed.blocks)
        ? parsed.blocks.map((b: Partial<ScriptBlock> & { id: string }) => ({
            id: b.id || generateId(),
            type: (b.type && ['scene_heading', 'action', 'character', 'dialogue'].includes(b.type)
              ? b.type
              : 'action') as BlockType,
            content: typeof b.content === 'string' ? b.content : '',
            linkedElementId: b.linkedElementId,
          }))
        : DEFAULT_SCRIPT.blocks.map((b) => ({ ...b })),
    }
  } catch {
    return { ...DEFAULT_SCRIPT, blocks: DEFAULT_SCRIPT.blocks.map((b) => ({ ...b })) }
  }
}

function extractText(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

function renderBoldMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function renderBlockContent(content: string, isEmphasis?: boolean): string {
  const withBold = renderBoldMarkdown(content)
  if (isEmphasis) {
    return `<span style="font-weight:800;font-size:1.05em;">${withBold}</span>`
  }
  return withBold
}

function getPrecedingCharacterName(
  blocks: ScriptBlock[],
  currentIndex: number
): string {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (blocks[i].type === 'character') {
      return blocks[i].content.trim()
    }
    break
  }
  return ''
}

function countScenes(blocks: ScriptBlock[]): number {
  return blocks.filter(b => b.type === 'scene_heading').length
}

function estimateDuration(blocks: ScriptBlock[]): string {
  let chars = 0
  blocks.forEach(b => {
    if (b.type === 'dialogue' || b.type === 'action') {
      chars += b.content.length
    }
  })
  const minutes = Math.max(1, Math.round(chars / 250))
  return `${minutes} 分钟`
}

interface AutocompleteOption {
  id: string
  name: string
  type: 'character' | 'scene'
  color?: string
  description?: string
}

function AutocompletePopup({
  options,
  query,
  onSelect,
  onClose,
  position,
  isDarkBg,
}: {
  options: AutocompleteOption[]
  query: string
  onSelect: (option: AutocompleteOption) => void
  onClose: () => void
  position: { top: number; left: number }
  isDarkBg: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(
    () =>
      query.trim()
        ? options.filter((o) =>
            o.name.toLowerCase().includes(query.toLowerCase())
          )
        : options,
    [options, query]
  )

  const prevQueryRef = useRef(query)
  useEffect(() => {
    if (prevQueryRef.current !== query) {
      prevQueryRef.current = query
      setSelectedIndex(0)
    }
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        e.stopPropagation()
        onSelect(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [filtered, selectedIndex, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-[100] w-72 rounded-lg border p-1 shadow-lg',
        isDarkBg
          ? 'bg-gray-900 border-gray-700'
          : 'bg-white border-gray-200'
      )}
      style={{ top: position.top + 28, left: position.left }}
    >
      <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
        {filtered.map((option, idx) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left',
              idx === selectedIndex
                ? isDarkBg
                  ? 'bg-gray-800 text-gray-100'
                  : 'bg-gray-100 text-gray-900'
                : isDarkBg
                  ? 'text-gray-300 hover:bg-gray-800'
                  : 'text-gray-600 hover:bg-gray-50'
            )}
            onClick={() => onSelect(option)}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            {option.type === 'character' ? (
              <Users className={cn('h-3.5 w-3.5 shrink-0', isDarkBg ? 'text-gray-500' : 'text-gray-400')} />
            ) : (
              <MapPin className={cn('h-3.5 w-3.5 shrink-0', isDarkBg ? 'text-gray-500' : 'text-gray-400')} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: option.color || '#888' }}
                />
                <span className="truncate font-medium">{option.name}</span>
              </div>
              {option.description && (
                <span className={cn('truncate text-xs', isDarkBg ? 'text-gray-500' : 'text-gray-400')}>
                  {option.description}
                </span>
              )}
            </div>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              isDarkBg ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
            )}>
              {option.type === 'character' ? '角色' : '场景'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ElementInfoPopover({
  element,
  children,
}: {
  element: StoryElement
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" side="top">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: element.color || '#888' }}
            />
            <h4 className="text-sm font-semibold">{element.name}</h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium ml-auto">
              {element.type === 'character' ? '角色' : '场景'}
            </span>
          </div>
          {element.content && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {element.content}
            </p>
          )}
          {element.updatedAt && (
            <p className="text-[10px] text-muted-foreground/60">
              更新于{' '}
              {new Date(element.updatedAt).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BlockCommandPalette({
  open,
  onOpenChange,
  onSelect,
  isDarkBg,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: BlockType) => void
  isDarkBg: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-md p-0 overflow-hidden',
        isDarkBg ? 'bg-gray-900 border-gray-700' : 'bg-white'
      )}>
        <DialogTitle className="sr-only">选择块类型</DialogTitle>
        <DialogDescription className="sr-only">选择要插入的剧本块类型</DialogDescription>
        <Command className={cn(
          '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:gap-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4',
          isDarkBg ? '[&_[cmdk-group-heading]]:text-gray-400' : '[&_[cmdk-group-heading]]:text-muted-foreground'
        )}>
          <CommandInput placeholder="选择块类型..." />
          <CommandList>
            <CommandEmpty className={isDarkBg ? 'text-gray-400' : ''}>未找到块类型</CommandEmpty>
            <CommandGroup heading="剧本块类型">
              {BLOCK_TYPES.map((bt) => (
                <CommandItem
                  key={bt.value}
                  value={`${bt.label} ${bt.description}`}
                  onSelect={() => {
                    onSelect(bt.value)
                    onOpenChange(false)
                  }}
                  className={cn(
                    isDarkBg ? 'text-gray-300' : 'text-gray-700'
                  )}
                >
                  <span className={isDarkBg ? 'text-gray-500' : 'text-gray-500'}>{bt.icon}</span>
                  <div className="flex-1">
                    <div className={cn(
                      'text-sm font-medium',
                      isDarkBg ? 'text-gray-200' : 'text-gray-900'
                    )}>{bt.label}</div>
                    <div className={cn(
                      'text-xs',
                      isDarkBg ? 'text-gray-500' : 'text-muted-foreground'
                    )}>
                      {bt.description}
                    </div>
                  </div>
                  {bt.shortcut && (
                    <span className={cn(
                      'text-[10px] ml-2 font-mono',
                      isDarkBg ? 'text-gray-600' : 'text-muted-foreground/50'
                    )}>
                      {bt.shortcut}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

interface ScriptBlockEditorProps {
  block: ScriptBlock
  index: number
  blocks: ScriptBlock[]
  onUpdate: (id: string, content: string, linkedElementId?: string) => void
  onDelete: (id: string) => void
  onTypeChange: (id: string, type: BlockType) => void
  onAddAfter: (afterId: string, type: BlockType) => void
  onShowAutocomplete: (
    blockId: string,
    type: 'character' | 'scene',
    query: string,
    position: { top: number; left: number }
  ) => void
  emphasisBlocks: Set<string>
  onToggleEmphasis: (blockId: string) => void
  onOpenCommandPalette: (afterBlockId: string) => void
  storyElements: StoryElement[]
  isDarkBg: boolean
}

const BLOCK_LAYOUT_STYLES: Record<BlockType, string> = {
  scene_heading: 'font-bold uppercase text-center tracking-wider text-sm leading-relaxed',
  action: 'text-sm leading-7',
  character: 'uppercase text-center font-semibold text-sm tracking-wider',
  dialogue: 'text-left text-sm leading-relaxed pl-12 pr-12',
}

function ScriptBlockEditor({
  block,
  index,
  blocks,
  onUpdate,
  onDelete,
  onTypeChange,
  onAddAfter,
  onShowAutocomplete,
  emphasisBlocks,
  onToggleEmphasis,
  onOpenCommandPalette,
  storyElements,
  isDarkBg,
}: ScriptBlockEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const precedingCharName =
    block.type === 'dialogue'
      ? getPrecedingCharacterName(blocks, index)
      : ''

  useEffect(() => {
    if (editableRef.current && document.activeElement !== editableRef.current) {
      editableRef.current.innerHTML = renderBlockContent(
        block.content,
        emphasisBlocks.has(block.id)
      )
    }
  }, [block.id])

  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.innerHTML = renderBlockContent(
        block.content,
        emphasisBlocks.has(block.id)
      )
    }
  }, [])

  const handleInput = useCallback(() => {
    if (!editableRef.current) return
    const text = extractText(editableRef.current.innerHTML)
    onUpdate(block.id, text)
  }, [block.id, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = extractText(editableRef.current?.innerHTML || '')
        if (text.trim() === '' && blocks.length > 1) {
          const nextBlock = blocks[index + 1]
          if (nextBlock) {
            const nextEl = document.querySelector(
              `[data-block-id="${nextBlock.id}"] [contenteditable]`
            )
            if (nextEl instanceof HTMLElement) {
              nextEl.focus()
            }
          }
          return
        }
        onAddAfter(block.id, block.type)
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        const currentIdx = BLOCK_TYPE_CYCLE.indexOf(block.type)
        const nextIdx = (currentIdx + 1) % BLOCK_TYPE_CYCLE.length
        onTypeChange(block.id, BLOCK_TYPE_CYCLE[nextIdx])
        return
      }

      if (e.key === 'Backspace') {
        const text = extractText(editableRef.current?.innerHTML || '')
        if (text.trim() === '' && blocks.length > 1) {
          e.preventDefault()
          const prevBlock = blocks[index - 1]
          if (prevBlock) {
            const prevEl = document.querySelector(
              `[data-block-id="${prevBlock.id}"] [contenteditable]`
            )
            if (prevEl instanceof HTMLElement) {
              prevEl.focus()
              const range = document.createRange()
              const sel = window.getSelection()
              range.selectNodeContents(prevEl)
              range.collapse(false)
              sel?.removeAllRanges()
              sel?.addRange(range)
            }
          }
          onDelete(block.id)
          return
        }
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const text = extractText(editableRef.current?.innerHTML || '')
        if (text.trim() === '') {
          e.preventDefault()
          onOpenCommandPalette(block.id)
          return
        }
      }

      if (e.key === 'B' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        onToggleEmphasis(block.id)
        return
      }
    },
    [
      block.id,
      block.type,
      blocks,
      index,
      onAddAfter,
      onDelete,
      onTypeChange,
      onOpenCommandPalette,
      onToggleEmphasis,
    ]
  )

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    if (!editableRef.current) return
    const text = extractText(editableRef.current.innerHTML)
    editableRef.current.innerHTML = renderBlockContent(
      text,
      emphasisBlocks.has(block.id)
    )
  }, [block.id, emphasisBlocks])

  const handleDoubleClick = useCallback(() => {
    if (block.type === 'character' && editableRef.current) {
      const rect = editableRef.current.getBoundingClientRect()
      onShowAutocomplete(block.id, 'character', '', {
        top: rect.top,
        left: rect.left,
      })
    }
    if (block.type === 'scene_heading' && editableRef.current) {
      const rect = editableRef.current.getBoundingClientRect()
      onShowAutocomplete(block.id, 'scene', '', {
        top: rect.top,
        left: rect.left,
      })
    }
  }, [block.type, block.id, onShowAutocomplete])

  const linkedElement = block.linkedElementId
    ? storyElements.find((el) => el.id === block.linkedElementId)
    : null

  return (
    <div
      data-block-id={block.id}
      className={cn(
        'group/script-block relative flex items-start gap-3 py-2 px-4 transition-colors',
        block.type === 'scene_heading' && 'mt-6 pt-3',
        isFocused && (isDarkBg ? 'bg-white/5' : 'bg-gray-50'),
        !isFocused && !isDarkBg && 'hover:bg-gray-50/60',
        !isFocused && isDarkBg && 'hover:bg-white/5',
        emphasisBlocks.has(block.id) && (isDarkBg ? 'bg-amber-900/20' : 'bg-amber-50'),
      )}
      onFocus={() => setIsFocused(true)}
    >
      <div className="flex items-start pt-1 select-none shrink-0 w-10">
        <span className={cn(
          'text-[10px] font-medium leading-none',
          isDarkBg ? 'text-gray-600' : 'text-gray-300',
          isFocused && (isDarkBg ? 'text-gray-400' : 'text-gray-400'),
        )}>
          {BLOCK_TYPE_LABELS[block.type]}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {block.type === 'dialogue' && precedingCharName && (
          <div className={cn(
            'text-center text-[10px] font-semibold mb-0.5 uppercase tracking-widest',
            isDarkBg ? 'text-gray-500' : 'text-gray-300'
          )}>
            {precedingCharName}
          </div>
        )}

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'outline-none min-h-[1.5em] break-words whitespace-pre-wrap cursor-text font-sans',
            BLOCK_LAYOUT_STYLES[block.type],
            isDarkBg ? 'text-gray-200' : 'text-gray-800',
            emphasisBlocks.has(block.id) && (isDarkBg ? 'text-amber-300' : 'text-amber-800'),
          )}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onDoubleClick={handleDoubleClick}
          onFocus={() => setIsFocused(true)}
          data-placeholder={
            block.type === 'scene_heading'
              ? '场景一 - 室内 - 白天'
              : block.type === 'action'
                ? '描述场景中的动作和事件...'
                : block.type === 'character'
                  ? '角色名'
                  : block.type === 'dialogue'
                    ? '角色台词...'
                    : ''
          }
          style={{ '--placeholder-color': isDarkBg ? 'rgba(200, 200, 200, 0.2)' : 'rgba(113, 113, 122, 0.3)' } as React.CSSProperties}
        />

        {linkedElement && (
          <div className="mt-1">
            <ElementInfoPopover element={linkedElement}>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs hover:underline cursor-pointer transition-colors',
                  isDarkBg ? 'text-blue-400' : 'text-blue-600'
                )}
                style={{
                  borderBottom: `1px solid ${isDarkBg ? 'rgba(96, 165, 250, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: linkedElement.color || (isDarkBg ? '#60a5fa' : '#2563eb') }}
                />
                {linkedElement.name}
              </button>
            </ElementInfoPopover>
          </div>
        )}
      </div>

      <div className={cn(
        'flex flex-col items-center pt-1 select-none shrink-0 w-6 opacity-0 group-hover/script-block:opacity-100 transition-opacity',
      )}>
        {block.type === 'dialogue' && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6 rounded-md',
                    emphasisBlocks.has(block.id)
                      ? isDarkBg
                        ? 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      : isDarkBg
                        ? 'text-gray-600 hover:text-amber-400 hover:bg-white/10'
                        : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
                  )}
                  onClick={() => onToggleEmphasis(block.id)}
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">重读笔 (Ctrl+Shift+B)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {blocks.length > 1 && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6 rounded-md',
                    isDarkBg
                      ? 'text-gray-600 hover:text-red-400 hover:bg-white/10'
                      : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                  )}
                  onClick={() => onDelete(block.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">删除块</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

function ShortcutsDialog({ isDarkBg }: { isDarkBg: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            'h-7 gap-1.5 text-xs',
            isDarkBg ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
          )}
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">快捷键</span>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className={cn(
          'sm:max-w-md',
          isDarkBg ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        )}
      >
        <DialogHeader>
          <DialogTitle className={cn(
            'flex items-center gap-2',
            isDarkBg ? 'text-gray-100' : 'text-gray-900'
          )}>
            <Keyboard className={cn('h-5 w-5', isDarkBg ? 'text-gray-400' : 'text-gray-600')} />
            键盘快捷键
          </DialogTitle>
          <DialogDescription className={isDarkBg ? 'text-gray-400' : 'text-gray-500'}>
            使用快捷键提升你的编剧效率
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <h4 className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              isDarkBg ? 'text-gray-500' : 'text-muted-foreground'
            )}>
              通用
            </h4>
            {[
              { keys: 'Ctrl+S', desc: '保存剧本' },
              { keys: '/', desc: '打开块类型选择（空块中）' },
              { keys: 'Enter', desc: '新建同类型块' },
              { keys: 'Tab', desc: '切换块类型' },
              { keys: 'Backspace', desc: '删除空块' },
              { keys: '**文字**', desc: '粗体文字' },
            ].map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between py-1"
              >
                <span className={cn('text-sm', isDarkBg ? 'text-gray-300' : 'text-gray-700')}>{s.desc}</span>
                <kbd className={cn(
                  'rounded border px-2 py-0.5 text-[11px] font-mono',
                  isDarkBg ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-muted text-muted-foreground'
                )}>
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <Separator className={isDarkBg ? 'bg-gray-800' : ''} />
          <div className="space-y-2">
            <h4 className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              isDarkBg ? 'text-gray-500' : 'text-muted-foreground'
            )}>
              插入块类型
            </h4>
            {[
              { keys: 'Ctrl+Shift+1', desc: '插入场景标题' },
              { keys: 'Ctrl+Shift+2', desc: '插入动作描述' },
              { keys: 'Ctrl+Shift+3', desc: '插入角色名' },
              { keys: 'Ctrl+Shift+4', desc: '插入对话' },
            ].map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between py-1"
              >
                <span className={cn('text-sm', isDarkBg ? 'text-gray-300' : 'text-gray-700')}>{s.desc}</span>
                <kbd className={cn(
                  'rounded border px-2 py-0.5 text-[11px] font-mono',
                  isDarkBg ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-muted text-muted-foreground'
                )}>
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <Separator className={isDarkBg ? 'bg-gray-800' : ''} />
          <div className="space-y-2">
            <h4 className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              isDarkBg ? 'text-gray-500' : 'text-muted-foreground'
            )}>
              格式化
            </h4>
            {[
              { keys: 'Ctrl+Shift+B', desc: '重读笔（强调标记）' },
              { keys: '双击角色块', desc: '角色名自动完成' },
              { keys: '双击场景标题', desc: '场景名自动完成' },
            ].map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between py-1"
              >
                <span className={cn('text-sm', isDarkBg ? 'text-gray-300' : 'text-gray-700')}>{s.desc}</span>
                <kbd className={cn(
                  'rounded border px-2 py-0.5 text-[11px] font-mono',
                  isDarkBg ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-muted text-muted-foreground'
                )}>
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ScriptEditor() {
  const { currentFile, setCurrentFile, token, storyElements, pageBg } = useAppStore()

  const [data, setData] = useState<ScriptData>(() => ({
    ...DEFAULT_SCRIPT,
    blocks: DEFAULT_SCRIPT.blocks.map((b) => ({ ...b })),
  }))
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const [emphasisBlocks, setEmphasisBlocks] = useState<Set<string>>(new Set())
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandPaletteAfterBlockId, setCommandPaletteAfterBlockId] = useState<
    string | null
  >(null)

  const [autocomplete, setAutocomplete] = useState<{
    blockId: string
    type: 'character' | 'scene'
    query: string
    position: { top: number; left: number }
  } | null>(null)

  const isDarkBg = pageBg === 'black'
  const bgConfig = PAGE_BG_OPTIONS.find(o => o.value === pageBg) || PAGE_BG_OPTIONS[0]

  const characterOptions = useMemo<AutocompleteOption[]>(() => {
    return storyElements
      .filter((el) => el.type === 'character')
      .map((el) => ({
        id: el.id,
        name: el.name,
        type: 'character' as const,
        color: el.color,
        description: el.content || undefined,
      }))
  }, [storyElements])

  const sceneOptions = useMemo<AutocompleteOption[]>(() => {
    return storyElements
      .filter((el) => el.type === 'scene')
      .map((el) => ({
        id: el.id,
        name: el.name,
        type: 'scene' as const,
        color: el.color,
        description: el.content || undefined,
      }))
  }, [storyElements])

  useEffect(() => {
    if (currentFile) {
      const parsed = parseScriptContent(currentFile.content)
      setData(parsed)
      setDirty(false)
    }
  }, [currentFile?.id])

  useEffect(() => {
    if (!dirty || !currentFile) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false)
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [data])

  const handleSave = useCallback(
    async (showToast = true) => {
      if (!currentFile) return

      setSaving(true)
      try {
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
          toast.success('剧本已保存')
        }
      } catch {
        toast.error('网络错误，请稍后重试')
      } finally {
        setSaving(false)
      }
    },
    [currentFile, data, token, setCurrentFile]
  )

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        handleSave(true)
        return
      }

      if (e.ctrlKey && e.shiftKey) {
        const lastBlock = data.blocks[data.blocks.length - 1]
        if (!lastBlock) return

        const blockTypeMap: Record<string, BlockType> = {
          '!': 'scene_heading',
          '@': 'action',
          '#': 'character',
          $: 'dialogue',
        }
        const newType = blockTypeMap[e.key]
        if (newType) {
          e.preventDefault()
          addBlockAfter(lastBlock.id, newType)
          return
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [data.blocks, handleSave])

  const addBlockAfter = useCallback(
    (afterId: string, type: BlockType, content = '') => {
      const newBlock: ScriptBlock = {
        id: generateId(),
        type,
        content:
          content ||
          (type === 'scene_heading'
            ? SCENE_HEADING_TEMPLATE
            : ''),
      }
      setData((prev) => {
        const idx = prev.blocks.findIndex((b) => b.id === afterId)
        const newBlocks = [...prev.blocks]
        newBlocks.splice(idx + 1, 0, newBlock)
        return { ...prev, blocks: newBlocks }
      })
      setDirty(true)

      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-block-id="${newBlock.id}"] [contenteditable]`
        )
        if (el instanceof HTMLElement) {
          el.focus()
        }
      })
    },
    []
  )

  const updateBlockContent = useCallback(
    (id: string, content: string, linkedElementId?: string) => {
      setData((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === id
            ? {
                ...b,
                content,
                ...(linkedElementId !== undefined
                  ? { linkedElementId }
                  : {}),
              }
            : b
        ),
      }))
      setDirty(true)

      if (content.startsWith('/') && autocomplete?.blockId !== id) {
        const el = document.querySelector(
          `[data-block-id="${id}"] [contenteditable]`
        )
        if (el instanceof HTMLElement) {
          const rect = el.getBoundingClientRect()
          const block = data.blocks.find((b) => b.id === id)
          if (block?.type === 'character') {
            setAutocomplete({
              blockId: id,
              type: 'character',
              query: content.slice(1),
              position: { top: rect.top, left: rect.left },
            })
          } else if (block?.type === 'scene_heading') {
            setAutocomplete({
              blockId: id,
              type: 'scene',
              query: content.slice(1),
              position: { top: rect.top, left: rect.left },
            })
          }
        }
      }
    },
    [data.blocks, autocomplete?.blockId]
  )

  const deleteBlock = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }))
    setDirty(true)
  }, [])

  const changeBlockType = useCallback((id: string, type: BlockType) => {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id ? { ...b, type } : b
      ),
    }))
    setDirty(true)
  }, [])

  const toggleEmphasis = useCallback((blockId: string) => {
    setEmphasisBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      return next
    })
  }, [])

  const handleAutocompleteSelect = useCallback(
    (option: AutocompleteOption) => {
      if (!autocomplete) return
      updateBlockContent(
        autocomplete.blockId,
        option.name,
        option.id
      )
      setAutocomplete(null)

      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-block-id="${autocomplete.blockId}"] [contenteditable]`
        )
        if (el instanceof HTMLElement) {
          el.innerHTML = renderBlockContent(option.name)
        }
      })
    },
    [autocomplete, updateBlockContent]
  )

  const handleShowAutocomplete = useCallback(
    (
      blockId: string,
      type: 'character' | 'scene',
      query: string,
      position: { top: number; left: number }
    ) => {
      setAutocomplete({ blockId, type, query, position })
    },
    []
  )

  const handleOpenCommandPalette = useCallback((afterBlockId: string) => {
    setCommandPaletteAfterBlockId(afterBlockId)
    setCommandPaletteOpen(true)
  }, [])

  const handleCommandSelect = useCallback(
    (type: BlockType) => {
      if (commandPaletteAfterBlockId) {
        addBlockAfter(commandPaletteAfterBlockId, type)
      }
      setCommandPaletteAfterBlockId(null)
    },
    [commandPaletteAfterBlockId, addBlockAfter]
  )

  if (!currentFile) {
    return (
      <div className={cn('flex h-full items-center justify-center')} style={{ backgroundColor: bgConfig.color }}>
        <div className="text-center">
          <Clapperboard className={cn('h-10 w-10 mx-auto mb-3', isDarkBg ? 'text-gray-600' : 'text-gray-300')} />
          <p className={cn('text-sm', isDarkBg ? 'text-gray-500' : 'text-gray-400')}>
            请选择一个剧本文件
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: bgConfig.color }}>
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        isDarkBg ? 'border-gray-800' : 'border-gray-100'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clapperboard className={cn('h-4 w-4', isDarkBg ? 'text-gray-500' : 'text-gray-400')} />
            <h2 className={cn(
              'text-sm font-medium truncate max-w-[200px] sm:max-w-none',
              isDarkBg ? 'text-gray-200' : 'text-gray-800'
            )}>
              {currentFile.name}
            </h2>
          </div>
          {dirty && (
            <span className={cn(
              'flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full',
              isDarkBg
                ? 'text-amber-400 bg-amber-900/30'
                : 'text-amber-600 bg-amber-50'
            )}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              未保存
            </span>
          )}
          {!dirty && lastSavedAt && (
            <span className={cn(
              'hidden sm:inline text-[11px]',
              isDarkBg ? 'text-gray-500' : 'text-gray-400'
            )}>
              <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />
              {lastSavedAt.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded',
            isDarkBg ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-100'
          )}>
            {data.blocks.length} 块
          </span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded hidden sm:inline-flex items-center gap-1',
            isDarkBg ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-100'
          )}>
            <Hash className="h-3 w-3" />
            {countScenes(data.blocks)} 场景
          </span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded hidden sm:inline-flex items-center gap-1',
            isDarkBg ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-100'
          )}>
            <Clock className="h-3 w-3" />
            {estimateDuration(data.blocks)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ShortcutsDialog isDarkBg={isDarkBg} />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(
                  'h-7 gap-1.5 text-xs',
                  isDarkBg ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                )}>
                  <Bold className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">粗体</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>使用 **文字** 格式化粗体</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 gap-1.5 text-xs',
                    isDarkBg ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                  )}
                  disabled={emphasisBlocks.size === 0}
                  onClick={() => setEmphasisBlocks(new Set())}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className={cn(
                    'hidden md:inline',
                    emphasisBlocks.size > 0 && (isDarkBg ? 'text-amber-400' : 'text-amber-600')
                  )}>
                    重读笔{emphasisBlocks.size > 0 ? ` (${emphasisBlocks.size})` : ''}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                重读笔 - 标记需要强调的台词
                {emphasisBlocks.size > 0 && ' · 点击清除所有'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className={cn('w-px h-4 mx-1', isDarkBg ? 'bg-gray-800' : 'bg-gray-200')} />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={dirty ? 'default' : 'ghost'}
                  className={cn(
                    'h-7 gap-1.5 text-xs',
                    !dirty && (isDarkBg ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
                  )}
                  onClick={() => handleSave(true)}
                  disabled={saving || !dirty}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">保存</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>保存剧本 (Ctrl+S)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" ref={editorContainerRef}>
        <div className="mx-auto max-w-[720px]">
          <div className="px-8 pt-12 pb-8 md:px-16">
            <div className="mb-8 text-center">
              <input
                type="text"
                value={data.title}
                onChange={(e) => {
                  setData((prev) => ({ ...prev, title: e.target.value }))
                  setDirty(true)
                }}
                placeholder="剧本标题"
                className={cn(
                  'w-full bg-transparent text-center text-2xl font-bold tracking-tight outline-none font-[Georgia,"Times New Roman",serif]',
                  isDarkBg
                    ? 'text-gray-100 placeholder:text-gray-700'
                    : 'text-gray-800 placeholder:text-gray-200'
                )}
              />
            </div>

            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', isDarkBg ? 'text-gray-500' : 'text-gray-400')}>
                  编剧
                </span>
                <input
                  type="text"
                  value={data.writer}
                  onChange={(e) => {
                    setData((prev) => ({
                      ...prev,
                      writer: e.target.value,
                    }))
                    setDirty(true)
                  }}
                  placeholder="编剧名"
                  className={cn(
                    'w-28 bg-transparent border-b text-center outline-none transition-colors',
                    isDarkBg
                      ? 'text-gray-300 border-gray-700 placeholder:text-gray-600 focus:border-gray-500'
                      : 'text-gray-600 border-gray-200 placeholder:text-gray-300 focus:border-gray-400'
                  )}
                />
              </div>
              <div className={cn('w-px h-3', isDarkBg ? 'bg-gray-700' : 'bg-gray-200')} />
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', isDarkBg ? 'text-gray-500' : 'text-gray-400')}>
                  版本
                </span>
                <input
                  type="text"
                  value={data.version}
                  onChange={(e) => {
                    setData((prev) => ({
                      ...prev,
                      version: e.target.value,
                    }))
                    setDirty(true)
                  }}
                  placeholder="第一稿"
                  className={cn(
                    'w-20 bg-transparent border-b text-center outline-none transition-colors',
                    isDarkBg
                      ? 'text-gray-300 border-gray-700 placeholder:text-gray-600 focus:border-gray-500'
                      : 'text-gray-600 border-gray-200 placeholder:text-gray-300 focus:border-gray-400'
                  )}
                />
              </div>
            </div>

            <Separator className="mt-8" />
          </div>

          <div className="px-4 pb-20 md:px-8">
            {data.blocks.map((block, index) => (
              <ScriptBlockEditor
                key={block.id}
                block={block}
                index={index}
                blocks={data.blocks}
                onUpdate={updateBlockContent}
                onDelete={deleteBlock}
                onTypeChange={changeBlockType}
                onAddAfter={addBlockAfter}
                onShowAutocomplete={handleShowAutocomplete}
                emphasisBlocks={emphasisBlocks}
                onToggleEmphasis={toggleEmphasis}
                onOpenCommandPalette={handleOpenCommandPalette}
                storyElements={storyElements}
                isDarkBg={isDarkBg}
              />
            ))}

            <div className="flex items-center justify-center pt-6 pb-8">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'gap-2 text-xs border border-dashed rounded-lg px-5 py-2',
                      isDarkBg
                        ? 'text-gray-600 hover:text-gray-400 border-gray-700 hover:border-gray-500 hover:bg-white/5'
                        : 'text-gray-400 hover:text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加新块
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60 p-1.5 rounded-lg" align="center">
                  <div className="space-y-0.5">
                    {BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                        onClick={() => {
                          const lastBlock =
                            data.blocks[data.blocks.length - 1]
                          if (lastBlock) {
                            addBlockAfter(lastBlock.id, bt.value)
                          }
                        }}
                      >
                        <span className="text-gray-400">{bt.icon}</span>
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">{bt.label}</span>
                          <span className="text-xs text-gray-400 ml-1.5">
                            {bt.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <BlockCommandPalette
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          setCommandPaletteOpen(open)
          if (!open) setCommandPaletteAfterBlockId(null)
        }}
        onSelect={handleCommandSelect}
        isDarkBg={isDarkBg}
      />

      {autocomplete && (
        <AutocompletePopup
          options={
            autocomplete.type === 'character'
              ? characterOptions
              : sceneOptions
          }
          query={autocomplete.query}
          position={autocomplete.position}
          onSelect={handleAutocompleteSelect}
          onClose={() => setAutocomplete(null)}
          isDarkBg={isDarkBg}
        />
      )}
    </div>
  )
}
