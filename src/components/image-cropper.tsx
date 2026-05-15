'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Move,
  Palette,
} from 'lucide-react'

interface ImageCropperProps {
  image: File | string
  onCrop: (dataUrl: string) => void
  onCancel: () => void
  aspectRatio?: number
}

const PRESET_COLORS = [
  '#FFFFFF',
  '#F3F4F6',
  '#E5E7EB',
  '#D1D5DB',
  '#9CA3AF',
  '#6B7280',
  '#374151',
  '#111827',
  '#FEE2E2',
  '#FECACA',
  '#FCA5A5',
  '#F87171',
  '#EF4444',
  '#DC2626',
  '#B91C1C',
  '#991B1B',
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#D97706',
  '#B45309',
  '#92400E',
  '#D1FAE5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#059669',
  '#047857',
  '#065F46',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#2563EB',
  '#1D4ED8',
  '#1E40AF',
  '#E0E7FF',
  '#C7D2FE',
  '#A5B4FC',
  '#818CF8',
  '#6366F1',
  '#4F46E5',
  '#4338CA',
  '#3730A3',
  '#F3E8FF',
  '#E9D5FF',
  '#D8B4FE',
  '#C084FC',
  '#A855F7',
  '#9333EA',
  '#7C3AED',
  '#6D28D9',
]

export function ImageCropper({ image, onCrop, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
  const [bgColorPickerOpen, setBgColorPickerOpen] = useState(false)
  const [customBgColor, setCustomBgColor] = useState('')

  // Load image
  useEffect(() => {
    let url: string
    if (typeof image === 'string') {
      url = image
    } else {
      url = URL.createObjectURL(image)
    }
    setImageUrl(url)
    return () => {
      if (typeof image !== 'string') {
        URL.revokeObjectURL(url)
      }
    }
  }, [image])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement
    setImgElement(img)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
    
    // Calculate initial scale to fit the image in container with some padding
    if (containerRef.current) {
      const containerSize = Math.min(containerRef.current.clientWidth, containerRef.current.clientHeight)
      const maxDim = Math.max(img.naturalWidth, img.naturalHeight)
      const paddingRatio = 0.9 // Leave 10% padding
      const initialScale = (containerSize / maxDim) * paddingRatio
      setScale(Math.min(initialScale, 1)) // Don't scale up beyond 1x by default
    } else {
      setScale(0.8)
    }
  }, [])

  // Mouse/Touch handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    setIsDragging(true)
    setDragStart({ x: clientX - position.x, y: clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 3))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.1))

  // Rotation control
  const handleRotate = () => setRotation(r => (r + 90) % 360)

  // Reset
  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  // Crop the image - render preview to offscreen canvas, then extract crop region
  const handleCrop = useCallback(() => {
    if (!imgElement || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio

    // Offscreen canvas matching the full preview container (CSS pixels)
    const fullW = rect.width
    const fullH = rect.height
    const previewCanvas = document.createElement('canvas')
    previewCanvas.width = fullW * dpr
    previewCanvas.height = fullH * dpr
    const pCtx = previewCanvas.getContext('2d')!
    pCtx.scale(dpr, dpr)

    // 1. Fill background color (matches the absolute inset-0 bg div)
    pCtx.fillStyle = backgroundColor
    pCtx.fillRect(0, 0, fullW, fullH)

    // 2. Draw image exactly as CSS does it
    // CSS: absolute inset-0 flex items-center justify-center → image centered in container
    // Then: transform: translate(x,y) rotate(θ) scale(s)
    pCtx.save()
    pCtx.translate(fullW / 2, fullH / 2)
    pCtx.translate(position.x, position.y)
    pCtx.rotate((rotation * Math.PI) / 180)
    pCtx.scale(scale, scale)

    let drawW = imgElement.naturalWidth
    let drawH = imgElement.naturalHeight
    if (rotation % 180 !== 0) {
      ;[drawW, drawH] = [drawH, drawW]
    }
    pCtx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH)
    pCtx.restore()

    const result = previewCanvas.toDataURL('image/png')
    onCrop(result)
  }, [imgElement, scale, rotation, position, backgroundColor, onCrop])

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto animate-scale-in">
      {/* Preview Area */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full aspect-square bg-muted rounded-xl overflow-hidden border-2 border-border',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Background preview - fills areas where image doesn't cover */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor }}
        />

        {imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={imageUrl}
              onLoad={handleImageLoad}
              alt="裁剪"
              draggable={false}
              className="max-w-none select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
              }}
            />
          </div>
        )}

        {/* Move hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 text-white text-xs">
          <Move className="h-3 w-3" />
          拖动移动图片
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Zoom & Rotate */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="w-32">
              <Slider
                value={[scale]}
                min={0.1}
                max={3}
                step={0.05}
                onValueChange={([v]) => setScale(v)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs"
              onClick={handleReset}
            >
              重置
            </Button>
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              背景色
            </span>
            <Popover open={bgColorPickerOpen} onOpenChange={setBgColorPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 -mr-1 gap-1.5">
                  <div
                    className="h-5 w-5 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor }}
                  />
                  <span className="text-xs">更换</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setBackgroundColor(color)
                          setBgColorPickerOpen(false)
                        }}
                        className={cn(
                          'h-7 w-7 rounded-md border border-border transition-transform hover:scale-110',
                          backgroundColor === color && 'ring-2 ring-primary ring-offset-2'
                        )}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customBgColor || backgroundColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="h-8 w-8 rounded-md cursor-pointer border-0 p-0"
                    />
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={customBgColor || backgroundColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-md border border-input bg-background"
                        placeholder="#FFFFFF"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        if (customBgColor) setBackgroundColor(customBgColor)
                        setBgColorPickerOpen(false)
                      }}
                    >
                      应用
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.slice(0, 16).map((color) => (
              <button
                key={color}
                onClick={() => setBackgroundColor(color)}
                className={cn(
                  'h-5 w-5 rounded-full border border-border transition-transform hover:scale-110',
                  backgroundColor === color && 'ring-1.5 ring-primary ring-offset-1'
                )}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={onCancel}>
            <X className="h-4 w-4" />
            取消
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleCrop}>
            <Crop className="h-4 w-4" />
            应用裁剪
          </Button>
        </div>
      </div>
    </div>
  )
}
