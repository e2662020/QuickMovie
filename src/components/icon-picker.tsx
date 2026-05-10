'use client'

import { useState, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImagePlus, Loader2, Smile, Search, Upload, X } from 'lucide-react'

const EMOJI_CATEGORIES: { label: string; key: string; emojis: string[] }[] = [
  {
    key: 'smileys',
    label: '表情',
    emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😎','🤗','🤭','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','💀','☠️','🤡','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
  },
  {
    key: 'gestures',
    label: '手势',
    emojis: ['👍','👎','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','🤙','👋','🤚','✋','🖐','🖖','👌','🤏','✍️','💪','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🧬','🩸','💉','💊','🩹','🩺'],
  },
  {
    key: 'nature',
    label: '自然',
    emojis: ['🔥','⭐','🌟','✨','💫','🌈','☀️','🌤','⛅','🌦','🌧','⛈','🌩','❄️','💨','💧','💦','🌊','🌍','🌎','🌏','🌱','🌲','🌳','🌴','🌵','🌾','🌿','🍀','🍁','🍂','🍃','🌺','🌻','🌹','🌷','🌼','🌸','💐','🍄','🌰','🐚'],
  },
  {
    key: 'food',
    label: '食物',
    emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🥒','🌶','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🧈','🥞','🧇','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🍜','🍝','🍣','🍤','🍚','🍱','🥟','🍢','🍡','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍿','🧋','🥤','🧃','🍵','☕','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾'],
  },
  {
    key: 'activities',
    label: '活动',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🎣','🤿','🏊','🚣','🧗','🚴','🤸','⛹️','🏋️','🤼','🤺','🥇','🥈','🥉','🏆','🎖','🏅','🎗','🎯','🎮','🕹','🎰','🎲','♟','🧩','🎭','🎨','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻'],
  },
  {
    key: 'travel',
    label: '旅行',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🛴','🚲','🚠','🚟','🚃','🚋','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩','🚀','🛸','🚁','🛶','⛵','🚤','🛳','⛴','🌋','🏔','⛰','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🏘','🏙','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🕋'],
  },
  {
    key: 'objects',
    label: '物品',
    emojis: ['💻','🖥','⌨','🖱','🖨','📱','📲','📞','📟','📠','🔋','🪫','🔌','💡','🔦','🕯','💶','💷','💵','💴','💸','💳','💎','⚖','🔧','🔨','⚒','🛠','⛏','🔩','⚙','🗜','🧲','🧪','🧫','🧬','🔭','🔬','🕳','💊','💉','🩸','🧬','🧹','🧺','🧻','🚽','🚿','🛁','🧼','🪥','🪒','🧴','💄','💍','👑','🎩','🧢','👒','🎓','⛑','🪖','📿','👓','🕶','🥽','🥼','🦺','👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘','🥻','🩱','👙','🩲','🩳','👚','👛','👜','👝','🎒','👞','👟','🥾','🥿','👠','👡','🩰','👢','🧳','🌂','☂️','💣','🔪','🗡','⚔','🛡'],
  },
  {
    key: 'symbols',
    label: '符号',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💘','💌','💟','♥️','♠️','♦️','♣️','🃏','💭','💬','🗯','💢','💥','💤','💦','💨','🕳','🎵','🎶','🔔','🔕','🎙','🎚','🎛','📢','📣','📯','🔈','🔉','🔊','💯','✅','❌','❓','❗','➕','➖','➗','✖️','〰️','💲','💱','©️','®️','™️','🔞','🚭','🚯','🚱','🚷','⚠️','☢','☣','⬆','↗','➡','↘','⬇','↙','⬅','↖','↕','↔','↩','↪','⤴','⤵','🔃','🔄','🔙','🔚','🔛','🔜','🔝'],
  },
  {
    key: 'flags',
    label: '旗帜',
    emojis: ['🏳️','🏴','🏁','🚩','🎌','🏴‍☠️','🇨🇳','🇺🇸','🇬🇧','🇯🇵','🇰🇷','🇩🇪','🇫🇷','🇮🇹','🇪🇸','🇷🇺','🇧🇷','🇮🇳','🇦🇺','🇨🇦','🇲🇽','🇸🇬','🇹🇭','🇻🇳','🇵🇭','🇲🇾','🇮🇩','🇳🇱','🇨🇭','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇧🇪','🇦🇹','🇵🇹','🇬🇷','🇹🇷','🇪🇬','🇿🇦','🇳🇬','🇰🇪','🇦🇷','🇨🇱','🇨🇴','🇵🇪'],
  },
]

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis)

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  emojis?: string[]
}

function isImageUrl(value: string): boolean {
  return value.startsWith('/') || value.startsWith('http') || value.startsWith('data:')
}

export function IconDisplay({ value, fallback, size = 'md' }: {
  value?: string | null
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const icon = value || fallback || '🎬'
  const sizeClasses = {
    sm: 'h-7 w-7 text-sm',
    md: 'h-10 w-10 text-lg',
    lg: 'h-14 w-14 text-3xl',
  }

  if (isImageUrl(icon)) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-lg overflow-hidden', sizeClasses[size])}>
        <img src={icon} alt="" className="h-full w-full object-cover rounded-lg" />
      </span>
    )
  }

  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-muted', sizeClasses[size])}>
      {icon}
    </span>
  )
}

export function IconPicker({ value, onChange, size = 'md', className }: IconPickerProps) {
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const previewSizeClasses = {
    sm: 'h-10 w-10 text-lg',
    md: 'h-14 w-14 text-2xl',
    lg: 'h-20 w-20 text-4xl',
  }

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return ALL_EMOJIS
    const q = searchQuery.toLowerCase()
    return ALL_EMOJIS.filter((emoji) => {
      return emoji.includes(q) || emoji === q
    })
  }, [searchQuery])

  const handleUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '上传失败')
        return
      }

      onChange(data.url)
      setOpen(false)
      toast.success('图片上传成功')
    } catch {
      toast.error('上传失败，请稍后重试')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items?.[0]?.kind === 'file') {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const handleClearImage = () => {
    onChange('🎬')
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-xl border-2 bg-gradient-to-br from-muted/60 to-muted/30 shadow-sm transition-shadow',
            previewSizeClasses[size],
            isImageUrl(value) && 'border-dashed'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isImageUrl(value) ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <span>{value}</span>
          )}

          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/20 z-10 backdrop-blur-[1px]">
              <Upload className="h-5 w-5 text-primary animate-bounce" />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                type="button"
              >
                <Smile className="h-3.5 w-3.5" />
                选择图标
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="bottom" sideOffset={8}>
              <div
                className="flex flex-col"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex items-center gap-2 border-b p-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-8 pl-8 text-sm"
                      placeholder="搜索图标..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {searchQuery.trim() ? (
                  <ScrollArea className="h-64 p-3">
                    {filteredEmojis.length > 0 ? (
                      <div className="grid grid-cols-8 gap-1">
                        {filteredEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={cn(
                              'flex items-center justify-center rounded-md p-1 text-xl hover:bg-accent transition-colors',
                              value === emoji && 'bg-primary/15 ring-1 ring-primary'
                            )}
                            onClick={() => { onChange(emoji); setOpen(false); setSearchQuery('') }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">没有找到匹配的图标</p>
                      </div>
                    )}
                  </ScrollArea>
                ) : (
                  <Tabs defaultValue="smileys" className="w-full">
                    <TabsList className="mx-1 mt-2 flex h-7 w-full flex-nowrap overflow-x-auto justify-start gap-0.5 bg-transparent p-0">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <TabsTrigger
                          key={cat.key}
                          value={cat.key}
                          className="h-7 px-2 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none"
                        >
                          {cat.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <TabsContent key={cat.key} value={cat.key} className="mt-0 pt-0">
                        <ScrollArea className="h-52 px-3 pb-3">
                          <div className="grid grid-cols-8 gap-0.5 pt-2">
                            {cat.emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className={cn(
                                  'flex items-center justify-center rounded-md p-1 text-xl hover:bg-accent transition-colors',
                                  value === emoji && 'bg-primary/15 ring-1 ring-primary'
                                )}
                                onClick={() => { onChange(emoji); setOpen(false) }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}

                <div className="border-t p-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    type="button"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    上传自定义图片
                  </Button>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                    支持 JPG/PNG/GIF/WebP，最大 2MB · 拖拽图片即可上传
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  )
}
