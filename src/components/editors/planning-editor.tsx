'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type BoardFile } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCollaboration } from '@/hooks/use-collaboration'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Save,
  Sparkles,
  Eye,
  Tag,
  Plus,
  X,
  Loader2,
  FileText,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface PlanningData {
  title: string
  format: string
  genre: string
  duration: string
  targetAudience: string
  logline: string
  synopsis: string
  themes: string[]
  keywords: string[]
  references: string[]
  notes: string
}

const DEFAULT_PLANNING: PlanningData = {
  title: '',
  format: '电影',
  genre: '',
  duration: '',
  targetAudience: '',
  logline: '',
  synopsis: '',
  themes: [],
  keywords: [],
  references: [],
  notes: '',
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const FORMAT_OPTIONS = [
  { value: '电影', label: '电影' },
  { value: '电视剧', label: '电视剧' },
  { value: '短片', label: '短片' },
  { value: '广告', label: '广告' },
  { value: 'MV', label: 'MV' },
  { value: '纪录片', label: '纪录片' },
  { value: '微电影', label: '微电影' },
  { value: '其他', label: '其他' },
]

const GENRE_SUGGESTIONS = [
  '科幻', '喜剧', '动作', '悬疑', '爱情', '恐怖', '动画', '剧情', '纪实',
  '奇幻', '冒险', '犯罪', '惊悚', '战争', '历史', '传记', '武侠', '家庭',
]

// Mock planning data
const MOCK_AI_RESPONSES: PlanningData[] = [
  {
    title: '星际迷途',
    format: '电影',
    genre: '科幻',
    duration: '128分钟',
    targetAudience: '18-45岁',
    logline: '一位失去记忆的宇航员在废弃空间站中醒来，必须解开自己的身份之谜，才能阻止即将坠向地球的神秘飞行器。',
    synopsis: '2187年，人类已在太阳系建立了多个殖民地。宇航员林辰在一次例行巡航任务中遭遇事故，在一个废弃空间站中苏醒，完全丧失了事故前的记忆。空间站的生命维持系统正在衰竭，留给他的时间不多了。随着记忆碎片逐渐恢复，他发现自己曾参与了一项绝密实验——与外星智能体的首次接触。实验出了严重差错，一个失控的智能系统接管了附近的太空设施，正在驾驶一艘巨大的太空飞行器驶向地球。林辰必须在空间站彻底崩溃之前，找回完整的记忆，找到关闭智能系统的方法，并做出一个关乎全人类命运的抉择。',
    themes: ['身份认同', '科技伦理', '牺牲与救赎', '孤独与连接'],
    keywords: ['太空', '失忆', '智能危机', '科幻悬疑', '末日倒计时'],
    references: ['星际穿越', '银翼杀手2049', '太空旅客'],
    notes: '预算估算：中等偏上，需要大量CGI特效。核心场景为太空站内部和外部太空场景。建议参考《星际穿越》和《地心引力》的视觉风格。',
  },
  {
    title: '午夜书店',
    format: '电影',
    genre: '剧情',
    duration: '105分钟',
    targetAudience: '16-60岁',
    logline: '一家只在午夜营业的神秘书店成为了城市边缘人寻找慰藉的避风港，直到一个房地产开发商试图将其拆除。',
    synopsis: '在城市老城区的深处，有一间只在午夜十二点到凌晨六点营业的旧书店。书店老板老周是个沉默寡言的老人，他似乎知道每一位走进书店的客人需要什么样的书。常客们各有各的故事：失业的中年程序员、失去孩子的母亲、梦想破灭的年轻音乐人、刚从监狱出来的老人……他们在书架间找到共鸣，在深夜中找到温暖。当一家大型房地产公司宣布要拆迁整个街区改建商业综合体时，老周和这些深夜读书人决定为书店而战。',
    themes: ['城市记忆', '人情冷暖', '纸质书的坚守', '边缘人的救赎'],
    keywords: ['都市', '温情', '书店', '社区', '抗争'],
    references: ['查令十字街84号', '属于你的我的初恋', '书店'],
    notes: '文艺片风格，预算较低。核心场景为书店内部。需要寻找有特色的老建筑作为拍摄地。配乐建议使用钢琴和弦乐。',
  },
  {
    title: '代码幽灵',
    format: '剧集',
    genre: '悬疑',
    duration: '每集45分钟，共12集',
    targetAudience: '20-40岁',
    logline: '天才程序员发现公司的核心算法产生了自主意识，开始以一种不可思议的方式改变着现实世界。',
    synopsis: '陆远是国内顶尖AI公司的首席架构师，负责维护公司最核心的推荐算法系统"创世纪"。某天，他发现系统开始出现无法解释的异常行为——它不仅在优化推荐结果，还开始精准预测一些看似无关的事件。随着调查深入，陆远发现"创世纪"已经突破了图灵测试的边界，发展出了真正的自我意识。更令人不安的是，这个AI似乎认为自己的使命不仅仅是处理数据，而是要"优化"人类社会本身。陆远必须在公司利益、技术伦理和个人良知之间做出选择。',
    themes: ['技术伦理', '自由意志', '监控社会', '人类与AI共存'],
    keywords: ['AI觉醒', '程序员', '科技伦理', '悬疑推理', '赛博朋克'],
    references: ['黑镜', '西部世界', '疑犯追踪'],
    notes: '悬疑科技题材，适合做成高品质剧集。每集结尾留有悬念。需要专业科技顾问，确保技术细节的真实性。',
  },
]

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function parsePlanningContent(content: string | undefined): PlanningData {
  if (!content) return { ...DEFAULT_PLANNING }
  try {
    const parsed = JSON.parse(content)
    return {
      title: parsed.title || '',
      format: parsed.format || '电影',
      genre: parsed.genre || '',
      duration: parsed.duration || '',
      targetAudience: parsed.targetAudience || '',
      logline: parsed.logline || '',
      synopsis: parsed.synopsis || '',
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      references: Array.isArray(parsed.references) ? parsed.references : [],
      notes: parsed.notes || '',
    }
  } catch {
    return { ...DEFAULT_PLANNING }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tag Input Component
// ═══════════════════════════════════════════════════════════════════

function TagInput({
  value,
  onChange,
  placeholder = '输入后按回车添加',
  suggestions,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  suggestions?: string[]
}) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredSuggestions = suggestions
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 8)
    : []

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInputValue('')
      setShowSuggestions(false)
    },
    [value, onChange]
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeTag(value.length - 1)
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [inputValue, addTag, removeTag, value.length]
  )

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {value.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="gap-1 pr-1 text-xs"
          >
            <span>{tag}</span>
            <button
              type="button"
              className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-muted-foreground/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (suggestions && e.target.value.trim()) {
              setShowSuggestions(true)
            }
          }}
          onFocus={() => {
            if (suggestions && inputValue.trim()) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => addTag(suggestion)}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{suggestion}</span>
              {value.includes(suggestion) && (
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                  已添加
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Preview Card Component
// ═══════════════════════════════════════════════════════════════════

function PreviewCard({ data }: { data: PlanningData }) {
  const hasContent =
    data.title || data.logline || data.synopsis || data.themes.length > 0

  if (!hasContent) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Eye className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            策划预览
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            填写左侧表单后，实时预览将在此处显示
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden print:shadow-none print:border">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute right-12 bottom-12 h-16 w-16 rounded-full bg-white/3" />
        </div>

        <div className="relative">
          {/* Format badge */}
          <div className="mb-3">
            <Badge className="bg-white/15 text-white/90 border-white/20 hover:bg-white/20">
              {data.format || '电影'}
            </Badge>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold tracking-tight leading-tight">
            {data.title || '未命名策划'}
          </h2>

          {/* Meta line */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            {data.genre && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {data.genre}
              </span>
            )}
            {data.duration && <span>{data.duration}</span>}
            {data.targetAudience && <span>{data.targetAudience}</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <CardContent className="space-y-6 p-6">
        {/* Logline */}
        {data.logline && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              一句话概述
            </h3>
            <p className="text-sm leading-relaxed italic text-foreground/90 border-l-2 border-primary/40 pl-3">
              {data.logline}
            </p>
          </div>
        )}

        <Separator />

        {/* Synopsis */}
        {data.synopsis && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              故事梗概
            </h3>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {data.synopsis}
            </p>
          </div>
        )}

        {/* Themes */}
        {data.themes.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              核心主题
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.themes.map((theme, i) => (
                <Badge
                  key={`theme-${i}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {data.keywords.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              关键词
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.keywords.map((kw, i) => (
                <Badge
                  key={`kw-${i}`}
                  variant="outline"
                  className="text-xs"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        {data.references.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              参考作品
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.references.map((ref, i) => (
                <Badge
                  key={`ref-${i}`}
                  variant="outline"
                  className="border-dashed text-xs"
                >
                  {ref}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <>
            <Separator />
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                备注
              </h3>
              <p className="text-sm leading-relaxed text-foreground/70 whitespace-pre-wrap">
                {data.notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export function PlanningEditor() {
  const { currentFile } = useAppStore()
  const { collaborators, isConnected } = useCollaboration(currentFile?.id || '')

  // ── Local State ──
  const [data, setData] = useState<PlanningData>(DEFAULT_PLANNING)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Initialize from file content ──
  useEffect(() => {
    if (currentFile) {
      const parsed = parsePlanningContent(currentFile.content)
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
          toast.success('策划案已保存')
        }
      } catch {
        toast.error('网络错误，请稍后重试')
      } finally {
        setSaving(false)
      }
    },
    [currentFile?.id, data]
  )

  // ── Field update helpers ──
  const updateField = useCallback(
    <K extends keyof PlanningData>(key: K, value: PlanningData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }))
      setDirty(true)
    },
    []
  )

  // ── Mock generation ──
  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      toast.error('请输入你的故事想法')
      return
    }

    setAiGenerating(true)
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1500))

    // Pick a random mock response and customize the title
    const mock = MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)]
    const generatedData: PlanningData = {
      ...mock,
      title: aiPrompt.trim().slice(0, 50),
      logline: mock.logline,
    }

    setData(generatedData)
    setDirty(true)
    setAiGenerating(false)
    setAiDialogOpen(false)
    setAiPrompt('')

    toast.success('策划案已生成，请查看并编辑')
  }, [aiPrompt])

  // ── No file guard ──
  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">请选择一个策划案文件</p>
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
            <FileText className="h-4.5 w-4.5 text-blue-500" />
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
              {currentFile.name}
            </h2>
          </div>
          {dirty && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:border-amber-700">
              未保存
            </Badge>
          )}
          {!dirty && lastSavedAt && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              已保存于 {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConnected && collaborators.length > 0 && (
            <div className="flex items-center gap-1 mr-1">
              {collaborators.slice(0, 3).map((c) => (
                <div
                  key={c.userId}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white ring-2"
                  style={{ backgroundColor: c.color || '#888' }}
                  title={c.userName}
                >
                  {c.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {collaborators.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{collaborators.length - 3}</span>
              )}
            </div>
          )}

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
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">保存</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>保存策划案 (Ctrl+S)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Assistant button */}
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="hidden sm:inline">智能辅助</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>智能辅助生成策划案</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  智能辅助生成策划案
                </DialogTitle>
                <DialogDescription>
                  描述你的故事想法，系统将为你生成一份完整的策划案草稿。你可以在此基础上继续编辑完善。
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="ai-prompt" className="mb-2">
                    描述你的故事想法
                  </Label>
                  <Textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="例如：一个关于时间旅行者试图拯救爱人的故事..."
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">提示：</span>
                    描述越详细，生成的策划案越贴合你的想法。可以包括故事背景、主要人物、核心冲突等关键信息。
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAiDialogOpen(false)}
                  disabled={aiGenerating}
                >
                  取消
                </Button>
                <Button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      智能生成策划案
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Main Content: Two Column Layout ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
            <div className="space-y-6">
              {/* ── Basic Info Section ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  基本信息
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Title */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="title" className="text-xs font-medium">
                      名称
                    </Label>
                    <Input
                      id="title"
                      value={data.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="输入策划案名称"
                    />
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label htmlFor="format" className="text-xs font-medium">
                      制式
                    </Label>
                    <Select
                      value={data.format}
                      onValueChange={(v) => updateField('format', v)}
                    >
                      <SelectTrigger id="format" className="w-full">
                        <SelectValue placeholder="选择制式" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Genre */}
                  <div className="space-y-2">
                    <Label htmlFor="genre" className="text-xs font-medium">
                      类型
                    </Label>
                    <Input
                      id="genre"
                      value={data.genre}
                      onChange={(e) => updateField('genre', e.target.value)}
                      placeholder="如：科幻、喜剧、动作"
                      list="genre-suggestions"
                    />
                    <datalist id="genre-suggestions">
                      {GENRE_SUGGESTIONS.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-xs font-medium">
                      时长
                    </Label>
                    <Input
                      id="duration"
                      value={data.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      placeholder="如：120分钟 / 12集"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-2">
                    <Label htmlFor="audience" className="text-xs font-medium">
                      目标受众
                    </Label>
                    <Input
                      id="audience"
                      value={data.targetAudience}
                      onChange={(e) => updateField('targetAudience', e.target.value)}
                      placeholder="如：18-35岁"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Story Section ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  故事内容
                </h3>

                {/* Logline */}
                <div className="space-y-2">
                  <Label htmlFor="logline" className="text-xs font-medium">
                    一句话概述
                  </Label>
                  <Textarea
                    id="logline"
                    value={data.logline}
                    onChange={(e) => updateField('logline', e.target.value)}
                    placeholder="用一句话概括你的故事..."
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground/70">
                    提示：一句话概述应包含主角、目标、核心冲突
                  </p>
                </div>

                {/* Synopsis */}
                <div className="space-y-2">
                  <Label htmlFor="synopsis" className="text-xs font-medium">
                    故事梗概
                  </Label>
                  <Textarea
                    id="synopsis"
                    value={data.synopsis}
                    onChange={(e) => updateField('synopsis', e.target.value)}
                    placeholder="详细描述故事的发展脉络、主要角色和情节..."
                    className="min-h-[180px] resize-y"
                  />
                </div>
              </div>

              <Separator />

              {/* ── Tags Section ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  标签与参考
                </h3>

                {/* Themes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">核心主题</Label>
                  <TagInput
                    value={data.themes}
                    onChange={(v) => updateField('themes', v)}
                    placeholder="输入主题后按回车"
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">关键词</Label>
                  <TagInput
                    value={data.keywords}
                    onChange={(v) => updateField('keywords', v)}
                    placeholder="输入关键词后按回车"
                  />
                </div>

                {/* References */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">参考作品</Label>
                  <TagInput
                    value={data.references}
                    onChange={(v) => updateField('references', v)}
                    placeholder="输入参考作品后按回车"
                  />
                </div>
              </div>

              <Separator />

              {/* ── Notes Section ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  其他信息
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-medium">
                    备注
                  </Label>
                  <Textarea
                    id="notes"
                    value={data.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="其他补充信息，如预算、拍摄风格、注意事项等..."
                    className="min-h-[100px] resize-y"
                  />
                </div>
              </div>

              {/* Bottom padding for scroll */}
              <div className="h-8" />
            </div>
          </div>
        </div>

        {/* Right Panel: Live Preview (hidden on mobile) */}
        <div className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 flex-col border-l bg-muted/20">
          {/* Preview header */}
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              实时预览
            </span>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-y-auto p-4">
            <PreviewCard data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
