'use client'

import { useState, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ImagePlus, Loader2, Smile, Search, Upload, X, Edit3 } from 'lucide-react'
import { ImageCropper } from './image-cropper'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [currentImage, setCurrentImage] = useState<File | string | null>(null)
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

  // Handle file selection - open crop dialog
  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB')
      return
    }
    setCurrentImage(file)
    setCropDialogOpen(true)
    setOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle crop completion
  const handleCropComplete = async (dataUrl: string) => {
    // Convert data URL to blob and upload
    try {
      // Parse data URL directly to blob
      const parts = dataUrl.split(',')
      const mimeMatch = parts[0].match(/:(.*?);/)
      const mime = mimeMatch ? mimeMatch[1] : 'image/png'
      const base64 = parts[1]
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mime })
      
      const file = new File([blob], 'cropped-icon.png', { type: mime })
      
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        toast.error(uploadData.error || '上传失败')
        return
      }

      onChange(uploadData.url)
      setCropDialogOpen(false)
      setCurrentImage(null)
      toast.success('图片设置成功')
    } catch (err) {
      console.error('Error handling crop complete:', err)
      toast.error('处理图片失败，请重试')
    }
  }

  const handleCancelCrop = () => {
    setCropDialogOpen(false)
    setCurrentImage(null)
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
    if (file) handleFileSelect(file)
  }

  const handleClearImage = () => {
    onChange('🎬')
  }

  const handleEditImage = () => {
    if (isImageUrl(value)) {
      setCurrentImage(value)
      setCropDialogOpen(true)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className={cn(
            'relative flex items-center justify-center rounded-xl border-2 bg-gradient-to-br from-muted/60 to-muted/30 shadow-sm transition-shadow group',
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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={handleEditImage}
                  className="p-1.5 bg-white/90 text-foreground rounded-full shadow-sm hover:bg-white transition-all hover:scale-105"
                  title="编辑图片"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90 transition-colors opacity-0 group-hover:opacity-100"
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
                  <div className="relative overflow-hidden rounded-md">
                    <button
                      className="w-full h-8 px-3 flex items-center justify-center gap-1.5 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors touch-manipulation select-none cursor-pointer"
                      type="button"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      上传自定义图片
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={handleFileChange}
                      style={{
                        opacity: 0,
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        top: 0,
                        left: 0,
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                    支持 JPG/PNG/GIF/WebP，最大 5MB · 拖拽图片即可上传
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-lg p-4">
          <DialogHeader className="px-1">
            <DialogTitle>裁剪图片</DialogTitle>
            <DialogDescription>
              裁剪为 1:1 比例，可添加背景色和内边距
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {currentImage && (
              <ImageCropper
                image={currentImage}
                aspectRatio={1}
                onCrop={handleCropComplete}
                onCancel={handleCancelCrop}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
