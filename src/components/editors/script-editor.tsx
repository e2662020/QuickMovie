'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore, type StoryElement, type BoardFile } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type BlockType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'

export interface ScriptBlock {
  id: string
  type: BlockType
  content: string
  /** Optional: linked story element id (character or scene) */
  linkedElementId?: string
}

export interface ScriptData {
  title: string
  writer: string
  version: string
  blocks: ScriptBlock[]
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

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
  },
  {
    value: 'parenthetical',
    label: '括号说明',
    description: '角色的神态或动作说明，如：(叹气)',
    icon: <Type className="h-4 w-4 opacity-60" />,
    shortcut: '',
  },
  {
    value: 'transition',
    label: '转场',
    description: '场景切换方式，如：CUT TO: / FADE OUT:',
    icon: <ChevronDown className="h-4 w-4" />,
    shortcut: '',
  },
]

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  scene_heading: '场景',
  action: '动作',
  character: '角色',
  dialogue: '对话',
  parenthetical: '说明',
  transition: '转场',
}

const BLOCK_TYPE_CYCLE: BlockType[] = [
  'scene_heading',
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'transition',
]

const TRANSITION_SUGGESTIONS = [
  'CUT TO:',
  'DISSOLVE TO:',
  'FADE IN:',
  'FADE OUT.',
  'FADE TO BLACK.',
  'SMASH CUT TO:',
  'MATCH CUT TO:',
  'JUMP CUT TO:',
  'TIME CUT:',
  'INTERCUT:',
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

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

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
            type: (b.type && ['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'].includes(b.type)
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

/** Extract text from HTML content (from contentEditable) */
function extractText(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

/** Render **bold** markdown in text as <strong> HTML */
function renderBoldMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/** Render a script block's content with formatting */
function renderBlockContent(content: string, isEmphasis?: boolean): string {
  const withBold = renderBoldMarkdown(content)
  if (isEmphasis) {
    return `<span style="font-weight:800;font-size:1.05em;">${withBold}</span>`
  }
  return withBold
}

/** Get the character name above a dialogue block */
function getPrecedingCharacterName(
  blocks: ScriptBlock[],
  currentIndex: number
): string {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (blocks[i].type === 'character') {
      return blocks[i].content.trim()
    }
    if (blocks[i].type !== 'parenthetical') {
      break
    }
  }
  return ''
}

// ═══════════════════════════════════════════════════════════════════
// Auto-Complete Popup Component
// ═══════════════════════════════════════════════════════════════════

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
}: {
  options: AutocompleteOption[]
  query: string
  onSelect: (option: AutocompleteOption) => void
  onClose: () => void
  position: { top: number; left: number }
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
      setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

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
      className="fixed z-[100] w-64 rounded-md border bg-popover p-1 shadow-lg"
      style={{ top: position.top + 28, left: position.left }}
    >
      <div className="max-h-[200px] overflow-y-auto">
        {filtered.map((option, idx) => (
          <button
            key={option.id}
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors text-left',
              idx === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
            onClick={() => onSelect(option)}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            {option.type === 'character' ? (
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                <span className="truncate text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {option.type === 'character' ? '角色' : '场景'}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Element Info Popover Component
// ═══════════════════════════════════════════════════════════════════

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
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
              {element.type === 'character' ? '角色' : '场景'}
            </Badge>
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

// ═══════════════════════════════════════════════════════════════════
// Command Palette Dialog
// ═══════════════════════════════════════════════════════════════════

function BlockCommandPalette({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: BlockType) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:gap-2 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <CommandInput placeholder="选择块类型..." />
          <CommandList>
            <CommandEmpty>未找到块类型</CommandEmpty>
            <CommandGroup heading="剧本块类型">
              {BLOCK_TYPES.map((bt) => (
                <CommandItem
                  key={bt.value}
                  value={`${bt.label} ${bt.description}`}
                  onSelect={() => {
                    onSelect(bt.value)
                    onOpenChange(false)
                  }}
                >
                  {bt.icon}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{bt.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {bt.description}
                    </div>
                  </div>
                  {bt.shortcut && (
                    <span className="text-[10px] text-muted-foreground/60 ml-2">
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

// ═══════════════════════════════════════════════════════════════════
// Script Block Component
// ═══════════════════════════════════════════════════════════════════

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
}: ScriptBlockEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null)
  const lineCountRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  const precedingCharName =
    block.type === 'dialogue'
      ? getPrecedingCharacterName(blocks, index)
      : ''

  // Sync content to editable on external changes
  useEffect(() => {
    if (editableRef.current && document.activeElement !== editableRef.current) {
      editableRef.current.innerHTML = renderBlockContent(
        block.content,
        emphasisBlocks.has(block.id)
      )
    }
  }, [block.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize content
  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.innerHTML = renderBlockContent(
        block.content,
        emphasisBlocks.has(block.id)
      )
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Count lines
  useEffect(() => {
    if (editableRef.current) {
      const text = extractText(editableRef.current.innerHTML)
      const count = text.split('\n').length
      setLineCount(count)
    }
  })

  const handleInput = useCallback(() => {
    if (!editableRef.current) return
    const text = extractText(editableRef.current.innerHTML)

    // Update line count
    const count = text.split('\n').length
    setLineCount(count)

    onUpdate(block.id, text)
  }, [block.id, onUpdate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Enter: create new block of same type
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = extractText(editableRef.current?.innerHTML || '')
        // If the current block is empty, do not create a new one
        if (text.trim() === '' && blocks.length > 1) {
          // Move focus to next block if available
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

      // Tab: cycle block type
      if (e.key === 'Tab') {
        e.preventDefault()
        const currentIdx = BLOCK_TYPE_CYCLE.indexOf(block.type)
        const nextIdx = (currentIdx + 1) % BLOCK_TYPE_CYCLE.length
        onTypeChange(block.id, BLOCK_TYPE_CYCLE[nextIdx])
        return
      }

      // Backspace on empty block: delete it
      if (e.key === 'Backspace') {
        const text = extractText(editableRef.current?.innerHTML || '')
        if (text.trim() === '' && blocks.length > 1) {
          e.preventDefault()
          // Focus previous block
          const prevBlock = blocks[index - 1]
          if (prevBlock) {
            const prevEl = document.querySelector(
              `[data-block-id="${prevBlock.id}"] [contenteditable]`
            )
            if (prevEl instanceof HTMLElement) {
              prevEl.focus()
              // Place cursor at end
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

      // "/" command palette trigger
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const text = extractText(editableRef.current?.innerHTML || '')
        if (text.trim() === '') {
          e.preventDefault()
          onOpenCommandPalette(block.id)
          return
        }
      }

      // Ctrl+Shift+B: toggle emphasis (重读笔)
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
    if (!editableRef.current) return
    // Re-render clean HTML after blur (cleanup any artifacts)
    const text = extractText(editableRef.current.innerHTML)
    editableRef.current.innerHTML = renderBlockContent(
      text,
      emphasisBlocks.has(block.id)
    )
  }, [block.id, emphasisBlocks])

  const handleDoubleClick = useCallback(() => {
    // Double click on character block: open autocomplete
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

  // Find linked element
  const linkedElement = block.linkedElementId
    ? storyElements.find((el) => el.id === block.linkedElementId)
    : null

  // Block-specific styling
  const blockStyles: Record<BlockType, string> = {
    scene_heading:
      'font-bold uppercase text-center tracking-wide text-sm leading-relaxed',
    action: 'text-sm leading-relaxed',
    character:
      'uppercase text-center font-semibold text-sm tracking-wider',
    dialogue: 'text-center text-sm leading-relaxed pl-12 pr-12',
    parenthetical:
      'text-center text-xs italic text-muted-foreground leading-relaxed pl-16 pr-16',
    transition:
      'text-right uppercase text-xs tracking-widest font-semibold',
  }

  return (
    <div
      data-block-id={block.id}
      className={cn(
        'group/script-block relative flex items-start gap-2 rounded-md py-2 px-3 transition-colors hover:bg-accent/30',
        block.type === 'scene_heading' && 'mt-6 pt-3',
        block.type === 'transition' && 'mb-2',
      )}
    >
      {/* Line numbers */}
      <div className="flex flex-col items-center pt-1 select-none shrink-0">
        <span className="text-[10px] text-muted-foreground/50 font-mono w-4 text-right">
          {index + 1}
        </span>
        {lineCount > 1 &&
          Array.from({ length: lineCount - 1 }, (_, i) => (
            <span
              key={i}
              className="text-[10px] text-muted-foreground/30 font-mono w-4 text-right"
            >
              {'\u00A0'}
            </span>
          ))}
      </div>

      {/* Block type indicator */}
      <div className="flex flex-col items-center pt-1.5 select-none shrink-0 w-10">
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] px-1 py-0 h-4 font-normal cursor-default border-dashed transition-colors',
                  block.type === 'scene_heading' && 'border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400',
                  block.type === 'action' && 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400',
                  block.type === 'character' && 'border-green-300 text-green-600 dark:border-green-700 dark:text-green-400',
                  block.type === 'dialogue' && 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400',
                  block.type === 'parenthetical' && 'border-purple-300 text-purple-500 dark:border-purple-700 dark:text-purple-400',
                  block.type === 'transition' && 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400',
                )}
              >
                {BLOCK_TYPE_LABELS[block.type]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p>{BLOCK_TYPES.find((b) => b.value === block.type)?.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Tab 切换类型 · Enter 新建
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Editable content */}
      <div className="flex-1 min-w-0">
        {/* Character name label above dialogue */}
        {block.type === 'dialogue' && precedingCharName && (
          <div className="text-center text-[10px] font-semibold text-muted-foreground/50 mb-0.5 uppercase tracking-wider">
            {precedingCharName}
          </div>
        )}

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'outline-none min-h-[1.5em] break-words whitespace-pre-wrap cursor-text',
            'font-[Courier_New,Courier,monospace]',
            'placeholder:text-muted-foreground/40',
            blockStyles[block.type],
            emphasisBlocks.has(block.id) && 'text-foreground',
          )}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onDoubleClick={handleDoubleClick}
          data-placeholder={
            block.type === 'scene_heading'
              ? '场景一 - 室内 - 白天'
              : block.type === 'action'
                ? '描述场景中的动作和事件...'
                : block.type === 'character'
                  ? '角色名'
                  : block.type === 'dialogue'
                    ? '角色台词...'
                    : block.type === 'parenthetical'
                      ? '(神态/动作说明)'
                      : block.type === 'transition'
                        ? 'CUT TO:'
                        : ''
          }
          style={{ '--tw-placeholder-opacity': 1 } as React.CSSProperties}
        />

        {/* Linked element indicator */}
        {linkedElement && (
          <div className="mt-0.5">
            <ElementInfoPopover element={linkedElement}>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                style={{
                  borderBottom: `2px solid ${linkedElement.color || 'hsl(var(--primary))'}`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: linkedElement.color || 'hsl(var(--primary))' }}
                />
                {linkedElement.name}
              </button>
            </ElementInfoPopover>
          </div>
        )}
      </div>

      {/* Action buttons (shown on hover) */}
      <div className="absolute -right-2 top-1 flex items-center gap-0.5 opacity-0 group-hover/script-block:opacity-100 transition-opacity">
        {block.type === 'dialogue' && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6',
                    emphasisBlocks.has(block.id) &&
                      'bg-primary/10 text-primary'
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
                  className="h-6 w-6 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
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

// ═══════════════════════════════════════════════════════════════════
// Keyboard Shortcuts Dialog
// ═══════════════════════════════════════════════════════════════════

function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">快捷键</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            使用快捷键提升你的编剧效率
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <span className="text-sm">{s.desc}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <span className="text-sm">{s.desc}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                <span className="text-sm">{s.desc}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
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

// ═══════════════════════════════════════════════════════════════════
// Main Component: ScriptEditor
// ═══════════════════════════════════════════════════════════════════

export function ScriptEditor() {
  const { currentFile, setCurrentFile, token, storyElements } = useAppStore()

  // ── Local State ──
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

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandPaletteAfterBlockId, setCommandPaletteAfterBlockId] = useState<
    string | null
  >(null)

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<{
    blockId: string
    type: 'character' | 'scene'
    query: string
    position: { top: number; left: number }
  } | null>(null)

  // ── Derive autocomplete options from storyElements ──
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

  // ── Initialize from file content ──
  useEffect(() => {
    if (currentFile) {
      const parsed = parseScriptContent(currentFile.content)
      setData(parsed)
      setDirty(false)
    }
  }, [currentFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save with debounce ──
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
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handler ──
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

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        handleSave(true)
        return
      }

      // Ctrl+Shift+1-4: Insert blocks at end
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
  }, [data.blocks, handleSave]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Block operations ──
  const addBlockAfter = useCallback(
    (afterId: string, type: BlockType, content = '') => {
      const newBlock: ScriptBlock = {
        id: generateId(),
        type,
        content:
          content ||
          (type === 'scene_heading'
            ? SCENE_HEADING_TEMPLATE
            : type === 'parenthetical'
              ? '()'
              : ''),
      }
      setData((prev) => {
        const idx = prev.blocks.findIndex((b) => b.id === afterId)
        const newBlocks = [...prev.blocks]
        newBlocks.splice(idx + 1, 0, newBlock)
        return { ...prev, blocks: newBlocks }
      })
      setDirty(true)

      // Focus new block after React renders
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-block-id="${newBlock.id}"] [contenteditable]`
        )
        if (el instanceof HTMLElement) {
          el.focus()
          // For parenthetical, place cursor between parentheses
          if (type === 'parenthetical') {
            const range = document.createRange()
            const sel = window.getSelection()
            if (el.firstChild) {
              range.setStart(el.firstChild, 1)
              range.collapse(true)
              sel?.removeAllRanges()
              sel?.addRange(range)
            }
          }
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

      // Check for "/" in character block to trigger autocomplete
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

  // ── Autocomplete handlers ──
  const handleAutocompleteSelect = useCallback(
    (option: AutocompleteOption) => {
      if (!autocomplete) return
      updateBlockContent(
        autocomplete.blockId,
        option.name,
        option.id
      )
      setAutocomplete(null)

      // Re-render the editable
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

  // ── Command palette handlers ──
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

  // ── No file guard ──
  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Film className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            请选择一个剧本文件
          </p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between border-b px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="h-4.5 w-4.5 text-violet-500" />
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
              {currentFile.name}
            </h2>
          </div>
          {dirty && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:border-amber-700"
            >
              未保存
            </Badge>
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
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {data.blocks.length} 块
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <ShortcutsDialog />

          {/* Bold formatting button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                  <Bold className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">粗体</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                使用 **文字** 格式化粗体
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Emphasis (重读笔) button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={emphasisBlocks.size === 0}
                  onClick={() => setEmphasisBlocks(new Set())}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden md:inline">
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

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Save button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={dirty ? 'default' : 'ghost'}
                  className="h-8 gap-1.5"
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

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-y-auto" ref={editorContainerRef}>
        {/* Script paper background */}
        <div className="min-h-full bg-[#faf8f0] dark:bg-[#1a1a16]">
          {/* Paper content area */}
          <div className="mx-auto max-w-[680px]">
            {/* ── Cover / Header Section ── */}
            <div className="px-8 pt-12 pb-8 md:px-16">
              {/* Title */}
              <div className="mb-8 text-center">
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, title: e.target.value }))
                    setDirty(true)
                  }}
                  placeholder="剧本标题"
                  className="w-full bg-transparent text-center text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/30 font-[Georgia,serif]"
                />
              </div>

              {/* Meta info */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/60 text-xs">
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
                    className="w-28 bg-transparent border-b border-dashed border-muted-foreground/20 text-center outline-none placeholder:text-muted-foreground/30 focus:border-primary/50 transition-colors"
                  />
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/60 text-xs">
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
                    className="w-20 bg-transparent border-b border-dashed border-muted-foreground/20 text-center outline-none placeholder:text-muted-foreground/30 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Decorative separator */}
              <div className="mt-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-muted-foreground/15" />
                <Film className="h-4 w-4 text-muted-foreground/25" />
                <div className="h-px flex-1 bg-muted-foreground/15" />
              </div>
            </div>

            {/* ── Block Editor ── */}
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
                />
              ))}

              {/* Add block button at end */}
              <div className="flex items-center justify-center pt-4 pb-8">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      添加新块
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="center">
                    <div className="space-y-0.5">
                      {BLOCK_TYPES.map((bt) => (
                        <button
                          key={bt.value}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm hover:bg-accent transition-colors text-left"
                          onClick={() => {
                            const lastBlock =
                              data.blocks[data.blocks.length - 1]
                            if (lastBlock) {
                              addBlockAfter(lastBlock.id, bt.value)
                            }
                          }}
                        >
                          {bt.icon}
                          <div className="flex-1">
                            <span className="font-medium">{bt.label}</span>
                            <span className="text-xs text-muted-foreground ml-1">
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
      </div>

      {/* ─── Command Palette Dialog ─── */}
      <BlockCommandPalette
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          setCommandPaletteOpen(open)
          if (!open) setCommandPaletteAfterBlockId(null)
        }}
        onSelect={handleCommandSelect}
      />

      {/* ─── Autocomplete Popup ─── */}
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
        />
      )}
    </div>
  )
}
