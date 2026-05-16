'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import { useAppStore, type BoardFile } from '@/lib/store'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  Edit,
  Copy,
  Play,
  Grid3X3,
  List,
  Clock,
  Camera,
  Image,
  MoveUp,
  MoveDown,
  Sparkles,
  Film,
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
  Save,
  Loader2,
  Upload,
  Download,
} from 'lucide-react'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface Shot {
  id: string
  order: number
  frameType: string   // 全景/中景/近景/特写/大特写
  cameraAngle: string // 平视/俯拍/仰拍/鸟瞰
  cameraMovement: string // 固定/推/拉/摇/移/跟
  description: string
  dialogue: string
  duration: string
  sound: string
  notes: string
  imageUrl: string | null
}

interface ShotBoardData {
  title: string
  shots: Shot[]
}

type ViewMode = 'grid' | 'timeline' | 'list'

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const FRAME_TYPES = ['全景', '中景', '近景', '特写', '大特写']
const CAMERA_ANGLES = ['平视', '俯拍', '仰拍', '鸟瞰']
const CAMERA_MOVEMENTS = ['固定', '推', '拉', '摇', '移', '跟']

const FRAME_TYPE_COLORS: Record<string, string> = {
  '全景': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  '中景': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  '近景': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  '特写': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  '大特写': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
}

const FRAME_TYPE_DOT_COLORS: Record<string, string> = {
  '全景': 'bg-blue-500',
  '中景': 'bg-green-500',
  '近景': 'bg-orange-500',
  '特写': 'bg-red-500',
  '大特写': 'bg-purple-500',
}

const DEFAULT_SHOT: Omit<Shot, 'id' | 'order'> = {
  frameType: '中景',
  cameraAngle: '平视',
  cameraMovement: '固定',
  description: '',
  dialogue: '',
  duration: '3秒',
  sound: '',
  notes: '',
  imageUrl: null,
}

const DEFAULT_DATA: ShotBoardData = {
  title: '',
  shots: [],
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function parseDurationToSeconds(dur: string): number {
  const match = dur.match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : 0
}

function parseShotBoardContent(content: string | undefined): ShotBoardData {
  if (!content) return { ...DEFAULT_DATA }
  try {
    const parsed = JSON.parse(content)
    return {
      title: parsed.title || '',
      shots: Array.isArray(parsed.shots) ? parsed.shots : [],
    }
  } catch {
    return { ...DEFAULT_DATA }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Sortable Shot Card (for Grid View)
// ═══════════════════════════════════════════════════════════════════

function SortableShotCard({
  shot,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  shot: Shot
  index: number
  isSelected: boolean
  onSelect: (shot: Shot) => void
  onEdit: (shot: Shot) => void
  onDuplicate: (shot: Shot) => void
  onDelete: (shot: Shot) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex-shrink-0 w-[220px] rounded-lg border bg-card shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-xl scale-105 z-50',
        isSelected && 'ring-2 ring-primary border-primary',
        !isSelected && 'hover:shadow-md hover:border-primary/30'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 z-10 cursor-grab active:cursor-grabbing rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Shot number badge */}
      <div className="absolute top-1.5 right-1.5 z-10">
        <Badge variant="secondary" className="h-5 min-w-[22px] justify-center text-[10px] font-bold px-1.5">
          {index + 1}
        </Badge>
      </div>

      {/* Image placeholder */}
      <div
        className="relative aspect-[16/10] bg-muted/50 cursor-pointer overflow-hidden rounded-t-lg"
        onClick={() => onSelect(shot)}
      >
        {shot.imageUrl ? (
          <img
            src={shot.imageUrl}
            alt={`Shot ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Film className="h-5 w-5" />
            </div>
            <span className="text-[10px]">点击添加画面</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all rounded-t-lg">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-muted-foreground hover:bg-white hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(shot) }}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-muted-foreground hover:bg-white hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); onDuplicate(shot) }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(shot) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card content */}
      <div
        className="p-2.5 space-y-2 cursor-pointer"
        onClick={() => onSelect(shot)}
      >
        {/* Badges row */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border', FRAME_TYPE_COLORS[shot.frameType] || 'bg-gray-100 text-gray-700 border-gray-200')}>
            {shot.frameType}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Camera className="h-2.5 w-2.5" />
            {shot.cameraAngle}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {shot.cameraMovement}
          </span>
        </div>

        {/* Description (truncated) */}
        {shot.description && (
          <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
            {shot.description}
          </p>
        )}

        {/* Dialogue (italic) */}
        {shot.dialogue && (
          <p className="text-[11px] italic text-muted-foreground line-clamp-1">
            &ldquo;{shot.dialogue}&rdquo;
          </p>
        )}

        {/* Duration */}
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {shot.duration}
          </span>
          {shot.sound && (
            <span className="text-[10px] text-muted-foreground">🔊</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Timeline View
// ═══════════════════════════════════════════════════════════════════

function TimelineView({
  shots,
  selectedIndex,
  onSelect,
}: {
  shots: Shot[]
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  const totalDuration = useMemo(
    () => shots.reduce((sum, s) => sum + parseDurationToSeconds(s.duration), 0),
    [shots]
  )

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex items-stretch px-6 py-6 min-w-max gap-0">
          {shots.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center min-h-[200px]">
              <p className="text-sm text-muted-foreground">暂无分镜，请添加镜头</p>
            </div>
          ) : (
            <>
              {shots.map((shot, index) => (
                <React.Fragment key={shot.id}>
                  {/* Shot block */}
                  <div className="flex flex-col items-center">
                    {/* Connector line */}
                    {index === 0 && (
                      <div className="w-px h-4 bg-border" />
                    )}
                    <button
                      className={cn(
                        'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-[140px]',
                        selectedIndex === index
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      )}
                      onClick={() => onSelect(index)}
                    >
                      {/* Shot number */}
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        #{index + 1}
                      </Badge>

                      {/* Thumbnail */}
                      <div className="w-[120px] aspect-[16/10] rounded-md overflow-hidden bg-muted/50">
                        {shot.imageUrl ? (
                          <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Film className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="w-full text-center space-y-0.5">
                        <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border', FRAME_TYPE_COLORS[shot.frameType])}>
                          {shot.frameType}
                        </span>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Camera className="h-2.5 w-2.5" />
                          {shot.cameraAngle} · {shot.cameraMovement}
                        </p>
                      </div>

                      {/* Duration */}
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {shot.duration}
                      </Badge>
                    </button>

                    {/* Arrow connector */}
                    {index < shots.length - 1 && (
                      <div className="flex items-center -mt-0.5 -mb-0.5">
                        <div className="w-8 h-px bg-border" />
                        <ChevronRight className="h-3 w-3 text-muted-foreground -ml-0.5" />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}

              {/* Total duration */}
              {shots.length > 0 && (
                <div className="flex items-center ml-4">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      总时长 {totalDuration.toFixed(1)}秒
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// List View
// ═══════════════════════════════════════════════════════════════════

function ListView({
  shots,
  selectedIndex,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  shots: Shot[]
  selectedIndex: number
  onSelect: (index: number) => void
  onEdit: (shot: Shot) => void
  onDuplicate: (shot: Shot) => void
  onDelete: (shot: Shot) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2">
        {shots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Film className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">暂无分镜</p>
            <p className="text-xs text-muted-foreground/60 mt-1">点击上方按钮添加镜头</p>
          </div>
        ) : (
          shots.map((shot, index) => (
            <div
              key={shot.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer',
                selectedIndex === index
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'hover:border-primary/30 hover:bg-muted/30'
              )}
              onClick={() => onSelect(index)}
            >
              {/* Drag / move */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onMoveUp(index) }}
                  disabled={index === 0}
                >
                  <MoveUp className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onMoveDown(index) }}
                  disabled={index === shots.length - 1}
                >
                  <MoveDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-[72px] h-[45px] rounded-md overflow-hidden bg-muted/50 shrink-0">
                {shot.imageUrl ? (
                  <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Shot number */}
              <Badge variant="secondary" className="h-6 min-w-[28px] justify-center text-xs font-bold shrink-0">
                {index + 1}
              </Badge>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium border', FRAME_TYPE_COLORS[shot.frameType])}>
                    {shot.frameType}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Camera className="h-2.5 w-2.5" />
                    {shot.cameraAngle} · {shot.cameraMovement}
                  </span>
                </div>
                {shot.description && (
                  <p className="text-xs text-foreground/80 truncate">{shot.description}</p>
                )}
                {shot.dialogue && (
                  <p className="text-[11px] italic text-muted-foreground truncate">
                    &ldquo;{shot.dialogue}&rdquo;
                  </p>
                )}
              </div>

              {/* Duration */}
              <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {shot.duration}
              </Badge>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); onEdit(shot) }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(shot) }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(shot) }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Detail Panel
// ═══════════════════════════════════════════════════════════════════

function DetailPanel({
  shot,
  index,
  onClose,
  onUpdate,
}: {
  shot: Shot
  index: number
  onClose: () => void
  onUpdate: (updates: Partial<Shot>) => void
}) {
  return (
    <div className="flex flex-col h-full border-l bg-card w-[360px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-bold text-xs">
            #{index + 1}
          </Badge>
          <span className="text-sm font-semibold">镜头详情</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Image area */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">画面</label>
            <div className="relative aspect-video rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 overflow-hidden cursor-pointer group">
              {shot.imageUrl ? (
                <img
                  src={shot.imageUrl}
                  alt={`Shot ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                    <Image className="h-6 w-6" />
                  </div>
                  <span className="text-xs">点击上传或智能生成</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:bg-black/30 hover:opacity-100 transition-all">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => toast.info('上传功能开发中')}
                >
                  <Upload className="h-3.5 w-3.5" />
                  上传图片
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => toast.info('智能画面生成功能开发中')}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              智能生成画面
            </Button>
          </div>

          <Separator />

          {/* Frame type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">景别</label>
            <div className="flex flex-wrap gap-1.5">
              {FRAME_TYPES.map((ft) => (
                <button
                  key={ft}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium border transition-all',
                    shot.frameType === ft
                      ? FRAME_TYPE_COLORS[ft]
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}
                  onClick={() => onUpdate({ frameType: ft })}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Camera angle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">拍摄角度</label>
            <div className="flex flex-wrap gap-1.5">
              {CAMERA_ANGLES.map((ca) => (
                <button
                  key={ca}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium border transition-all',
                    shot.cameraAngle === ca
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}
                  onClick={() => onUpdate({ cameraAngle: ca })}
                >
                  {ca}
                </button>
              ))}
            </div>
          </div>

          {/* Camera movement */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">摄影机运动</label>
            <div className="flex flex-wrap gap-1.5">
              {CAMERA_MOVEMENTS.map((cm) => (
                <button
                  key={cm}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium border transition-all',
                    shot.cameraMovement === cm
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}
                  onClick={() => onUpdate({ cameraMovement: cm })}
                >
                  {cm}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">画面描述</label>
            <Textarea
              value={shot.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="描述这个镜头的画面内容..."
              className="min-h-[80px] resize-y text-sm"
            />
          </div>

          {/* Dialogue */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">台词/旁白</label>
            <Textarea
              value={shot.dialogue}
              onChange={(e) => onUpdate({ dialogue: e.target.value })}
              placeholder="角色的台词或旁白内容..."
              className="min-h-[60px] resize-y text-sm italic"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">时长</label>
            <Input
              value={shot.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              placeholder="如：3秒"
              className="h-9 text-sm"
            />
          </div>

          {/* Sound */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">音效/音乐</label>
            <Input
              value={shot.sound}
              onChange={(e) => onUpdate({ sound: e.target.value })}
              placeholder="如：紧张的音乐渐入..."
              className="h-9 text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">备注</label>
            <Textarea
              value={shot.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="其他需要记录的信息..."
              className="min-h-[60px] resize-y text-sm"
            />
          </div>

          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Preview Modal
// ═══════════════════════════════════════════════════════════════════

function PreviewModal({
  open,
  onOpenChange,
  shots,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shots: Shot[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset index when modal opens
  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (prevOpenRef.current !== open) {
      prevOpenRef.current = open
      if (open) {
        setCurrentIndex(0) // eslint-disable-line react-hooks/set-state-in-effect
        setIsPlaying(false) // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play
  useEffect(() => {
    if (isPlaying && shots.length > 0) {
      const shot = shots[currentIndex]
      const durationMs = parseDurationToSeconds(shot.duration) * 1000 || 3000

      timerRef.current = setTimeout(() => {
        if (currentIndex < shots.length - 1) {
          setCurrentIndex((prev) => prev + 1)
        } else {
          setIsPlaying(false)
          setCurrentIndex(0)
        }
      }, durationMs)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentIndex, shots])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(shots.length - 1, prev + 1))
  }, [shots.length])

  const currentShot = shots[currentIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Progress bar */}
          {shots.length > 0 && (
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${shots.length > 1 ? ((currentIndex) / (shots.length - 1)) * 100 : 100}%` }}
              />
            </div>
          )}

          {/* Preview area */}
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {currentShot ? (
              <>
                {currentShot.imageUrl ? (
                  <img
                    src={currentShot.imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/40">
                    <Film className="h-16 w-16" />
                    <span className="text-sm">镜头画面</span>
                  </div>
                )}

                {/* Shot info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="font-bold">#{currentIndex + 1}</Badge>
                      <span className={cn('text-white text-xs px-1.5 py-0.5 rounded', FRAME_TYPE_COLORS[currentShot.frameType]?.replace(/dark:/g, ''))}>
                        {currentShot.frameType}
                      </span>
                      <span className="text-white/70 text-xs">
                        {currentShot.cameraAngle} · {currentShot.cameraMovement}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-white border-white/30 gap-1">
                      <Clock className="h-3 w-3" />
                      {currentShot.duration}
                    </Badge>
                  </div>
                  {currentShot.dialogue && (
                    <p className="mt-2 text-white/90 text-sm italic">
                      &ldquo;{currentShot.dialogue}&rdquo;
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-white/50 text-sm">暂无镜头</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {currentIndex + 1} / {shots.length}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={shots.length === 0}
              >
                {isPlaying ? (
                  <>
                    <div className="flex gap-0.5">
                      <div className="w-1 h-3 bg-current rounded-sm" />
                      <div className="w-1 h-3 bg-current rounded-sm" />
                    </div>
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    播放
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handleNext}
                disabled={currentIndex >= shots.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export function ShotEditor() {
  const { currentFile } = useAppStore()

  // ── State ──
  const [data, setData] = useState<ShotBoardData>(DEFAULT_DATA)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedShotIndex, setSelectedShotIndex] = useState<number>(-1)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shots = useMemo(() => data.shots, [data.shots])
  const selectedShot = selectedShotIndex >= 0 ? shots[selectedShotIndex] : null

  const totalDuration = useMemo(
    () => shots.reduce((sum, s) => sum + parseDurationToSeconds(s.duration), 0),
    [shots]
  )

  // ── Initialize from file content ──
  useEffect(() => {
    if (currentFile) {
      const parsed = parseShotBoardContent(currentFile.content)
      setData(parsed)
      setSelectedShotIndex(-1)
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
        const res = await apiFetch('/api/boards/files', {
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
          toast.success('分镜已保存')
        }
      } catch {
        toast.error('网络错误，请稍后重试')
      } finally {
        setSaving(false)
      }
    },
    [currentFile?.id, data]
  )

  // ── Shot CRUD ──
  const addShot = useCallback(() => {
    const newShot: Shot = {
      ...DEFAULT_SHOT,
      id: generateId(),
      order: shots.length + 1,
    }
    setData((prev) => ({
      ...prev,
      shots: [...prev.shots, newShot],
    }))
    setDirty(true)
    setSelectedShotIndex(shots.length)
    toast.success('镜头已添加')
  }, [shots.length])

  const duplicateShot = useCallback(
    (shot: Shot) => {
      const idx = shots.findIndex((s) => s.id === shot.id)
      const newShot: Shot = {
        ...shot,
        id: generateId(),
        order: idx + 2,
      }
      const newShots = [...shots]
      newShots.splice(idx + 1, 0, newShot)
      // Recalculate order
      newShots.forEach((s, i) => (s.order = i + 1))
      setData((prev) => ({ ...prev, shots: newShots }))
      setDirty(true)
      setSelectedShotIndex(idx + 1)
      toast.success('镜头已复制')
    },
    [shots]
  )

  const deleteShot = useCallback(
    (shot: Shot) => {
      const idx = shots.findIndex((s) => s.id === shot.id)
      const newShots = shots.filter((s) => s.id !== shot.id)
      newShots.forEach((s, i) => (s.order = i + 1))
      setData((prev) => ({ ...prev, shots: newShots }))
      setDirty(true)
      if (selectedShotIndex === idx) {
        setSelectedShotIndex(-1)
      } else if (selectedShotIndex > idx) {
        setSelectedShotIndex((prev) => prev - 1)
      }
      toast.success('镜头已删除')
    },
    [shots, selectedShotIndex]
  )

  const updateShot = useCallback(
    (shotId: string, updates: Partial<Shot>) => {
      setData((prev) => ({
        ...prev,
        shots: prev.shots.map((s) => (s.id === shotId ? { ...s, ...updates } : s)),
      }))
      setDirty(true)
    },
    []
  )

  const moveShot = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newShots = [...shots]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newShots.length) return
      ;[newShots[index], newShots[targetIndex]] = [newShots[targetIndex], newShots[index]]
      newShots.forEach((s, i) => (s.order = i + 1))
      setData((prev) => ({ ...prev, shots: newShots }))
      setDirty(true)
      if (selectedShotIndex === index) {
        setSelectedShotIndex(targetIndex)
      } else if (selectedShotIndex === targetIndex) {
        setSelectedShotIndex(index)
      }
    },
    [shots, selectedShotIndex]
  )

  // ── DnD handlers ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = shots.findIndex((s) => s.id === active.id)
      const newIndex = shots.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const newShots = arrayMove(shots, oldIndex, newIndex)
      newShots.forEach((s, i) => (s.order = i + 1))
      setData((prev) => ({ ...prev, shots: newShots }))
      setDirty(true)

      // Update selection if needed
      if (selectedShotIndex === oldIndex) {
        setSelectedShotIndex(newIndex)
      }
    },
    [shots, selectedShotIndex]
  )

  // ── Mock generation ──
  const handleAiBatchGenerate = useCallback(async () => {
    if (shots.length === 0) {
      toast.error('请先添加镜头')
      return
    }

    setAiGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000))

    const mockDescriptions = [
      '主角站在窗前，望着窗外灰蒙蒙的天空',
      '特写：手指轻轻触碰泛黄的照片',
      '镜头从桌面缓缓扫过凌乱的文件和咖啡杯',
      '人群涌动，主角逆流而行',
      '门被猛地推开，角色惊恐地回头',
      '夕阳下，两个身影在长椅上并肩而坐',
    ]

    setData((prev) => ({
      ...prev,
      shots: prev.shots.map((s, i) => ({
        ...s,
        description: s.description || mockDescriptions[i % mockDescriptions.length],
      })),
    }))
    setDirty(true)
    setAiGenerating(false)
    toast.success('已为所有空镜头生成画面描述')
  }, [shots])

  const handleExport = useCallback(() => {
    toast.info('导出功能开发中')
  }, [])

  const handleImport = useCallback(() => {
    toast.info('导入功能开发中')
  }, [])

  // ── No file guard ──
  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Film className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">请选择一个分镜文件</p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Film className="h-4.5 w-4.5 shrink-0 text-primary" />
          <h2 className="text-sm font-semibold truncate">{currentFile.name}</h2>
          {dirty && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:border-amber-700 shrink-0">
              未保存
            </Badge>
          )}
          {!dirty && lastSavedAt && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground shrink-0">
              已保存 {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>网格视图</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('timeline')}
                >
                  <Film className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>时间轴视图</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>列表视图</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Save */}
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
              </Button>
            </TooltipTrigger>
            <TooltipContent>保存</TooltipContent>
          </Tooltip>

          {/* Add shot */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5" onClick={addShot}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">添加镜头</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>添加新镜头</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 border-b px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-3 mr-auto">
          <span className="text-xs text-muted-foreground">
            共 {shots.length} 个镜头
          </span>
          {shots.length > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              总时长 {totalDuration.toFixed(1)}秒
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={handleImport}
              >
                <Upload className="h-3 w-3" />
                <span className="hidden md:inline">导入</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>导入分镜</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={handleExport}
              >
                <Download className="h-3 w-3" />
                <span className="hidden md:inline">导出</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>导出分镜</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={handleAiBatchGenerate}
                disabled={aiGenerating || shots.length === 0}
              >
                {aiGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
                <span className="hidden md:inline">批量生成</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>为空镜头生成画面描述</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setShowPreview(true)}
                disabled={shots.length === 0}
              >
                <Play className="h-3 w-3" />
                <span className="hidden md:inline">预览播放</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>预览分镜序列</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Shot area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'grid' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <ScrollArea className="flex-1">
                <div className="p-6 min-h-full">
                  {shots.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
                        <Film className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        开始创建分镜
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60 max-w-[300px] text-center">
                        添加镜头来构建你的故事分镜板。可以设置景别、角度、运动方式，添加画面描述和台词。
                      </p>
                      <Button className="mt-4 gap-2" onClick={addShot}>
                        <Plus className="h-4 w-4" />
                        添加第一个镜头
                      </Button>
                    </div>
                  ) : (
                    /* Grid filmstrip */
                    <SortableContext
                      items={shots.map((s) => s.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="flex flex-wrap gap-4 pb-4">
                        {shots.map((shot, index) => (
                          <SortableShotCard
                            key={shot.id}
                            shot={shot}
                            index={index}
                            isSelected={selectedShotIndex === index}
                            onSelect={(s) =>
                              setSelectedShotIndex(shots.findIndex((sh) => sh.id === s.id))
                            }
                            onEdit={(s) =>
                              setSelectedShotIndex(shots.findIndex((sh) => sh.id === s.id))
                            }
                            onDuplicate={duplicateShot}
                            onDelete={deleteShot}
                          />
                        ))}

                        {/* Add card */}
                        <button
                          className="flex-shrink-0 w-[220px] rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground/50 hover:border-primary/40 hover:text-primary/60 hover:bg-primary/5 transition-all cursor-pointer"
                          onClick={addShot}
                        >
                          <Plus className="h-8 w-8" />
                          <span className="text-xs">添加镜头</span>
                        </button>
                      </div>
                    </SortableContext>
                  )}
                </div>
              </ScrollArea>
              <DragOverlay>
                {activeId ? (
                  <div className="w-[220px] rounded-lg border bg-card shadow-xl opacity-80 p-3">
                    <div className="aspect-[16/10] rounded-md bg-muted/50 flex items-center justify-center">
                      <Film className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : viewMode === 'timeline' ? (
            <TimelineView
              shots={shots}
              selectedIndex={selectedShotIndex}
              onSelect={setSelectedShotIndex}
            />
          ) : (
            <ListView
              shots={shots}
              selectedIndex={selectedShotIndex}
              onSelect={setSelectedShotIndex}
              onEdit={(s) =>
                setSelectedShotIndex(shots.findIndex((sh) => sh.id === s.id))
              }
              onDuplicate={duplicateShot}
              onDelete={deleteShot}
              onMoveUp={(i) => moveShot(i, 'up')}
              onMoveDown={(i) => moveShot(i, 'down')}
            />
          )}

          {/* Legend bar */}
          {shots.length > 0 && (
            <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground bg-muted/10">
              <span className="font-medium">景别:</span>
              {FRAME_TYPES.map((ft) => (
                <span key={ft} className="flex items-center gap-1">
                  <span className={cn('inline-block h-2 w-2 rounded-full', FRAME_TYPE_DOT_COLORS[ft])} />
                  {ft}
                </span>
              ))}
              <span className="ml-auto">
                {viewMode === 'grid' && '拖拽卡片可调整顺序 · 点击打开详情'}
                {viewMode === 'timeline' && '点击镜头节点查看详情'}
                {viewMode === 'list' && '使用箭头按钮调整顺序'}
              </span>
            </div>
          )}
        </div>

        {/* ─── Detail Panel (right side) ─── */}
        {selectedShot && (
          <DetailPanel
            shot={selectedShot}
            index={selectedShotIndex}
            onClose={() => setSelectedShotIndex(-1)}
            onUpdate={(updates) => updateShot(selectedShot.id, updates)}
          />
        )}
      </div>

      {/* ─── Preview Modal ─── */}
      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        shots={shots}
      />
    </div>
  )
}
