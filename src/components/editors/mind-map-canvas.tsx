'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  MapPin,
  Zap,
  GripVertical,
  Check,
  X,
} from 'lucide-react'

interface MindMapNode {
  id: string
  x: number
  y: number
  title: string
  color: string
  type: 'character' | 'scene' | 'event' | 'default'
  icon?: string
}

interface MindMapConnection {
  id: string
  from: string
  to: string
}

interface MindMapCanvasProps {
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  onNodesChange: (nodes: MindMapNode[]) => void
  onConnectionsChange: (connections: MindMapConnection[]) => void
  className?: string
}

const NODE_COLORS = {
  character: '#3b82f6',
  scene: '#10b981',
  event: '#f59e0b',
  default: '#8b5cf6',
}

const NODE_ICONS = {
  character: Users,
  scene: MapPin,
  event: Zap,
  default: GripVertical,
}

const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6', '#a855f7', '#f43f5e',
]

export function MindMapCanvas({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  className,
}: MindMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [draggingCanvas, setDraggingCanvas] = useState(false)
  const [draggingConnection, setDraggingConnection] = useState<{
    from: string
    x: number
    y: number
  } | null>(null)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  
  const lastMousePos = useRef({ x: 0, y: 0 })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((prev) => Math.min(Math.max(prev * delta, 0.25), 4))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setDraggingCanvas(true)
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      setContextMenu(null)
      setSelectedNode(null)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }
    
    if (draggingNode) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const newX = (e.clientX - rect.left - pan.x) / scale
      const newY = (e.clientY - rect.top - pan.y) / scale
      
      onNodesChange(
        nodes.map((node) =>
          node.id === draggingNode ? { ...node, x: newX, y: newY } : node
        )
      )
    }
    
    if (draggingConnection) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      
      setDraggingConnection({
        ...draggingConnection,
        x: (e.clientX - rect.left - pan.x) / scale,
        y: (e.clientY - rect.top - pan.y) / scale,
      })
    }
  }, [draggingCanvas, draggingNode, draggingConnection, pan, scale, nodes, onNodesChange])

  const handleMouseUp = useCallback(() => {
    setDraggingCanvas(false)
    setDraggingNode(null)
    setDraggingConnection(null)
  }, [])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setDraggingNode(nodeId)
    setSelectedNode(nodeId)
  }, [])

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation()
    setEditingNode(node.id)
    setEditValue(node.title)
  }, [])

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY })
  }, [])

  const handleEditSubmit = useCallback(() => {
    if (editingNode && editValue.trim()) {
      onNodesChange(
        nodes.map((node) =>
          node.id === editingNode ? { ...node, title: editValue.trim() } : node
        )
      )
    }
    setEditingNode(null)
    setEditValue('')
  }, [editingNode, editValue, nodes, onNodesChange])

  const handleDeleteNode = useCallback((nodeId: string) => {
    onNodesChange(nodes.filter((node) => node.id !== nodeId))
    onConnectionsChange(connections.filter((conn) => conn.from !== nodeId && conn.to !== nodeId))
    setContextMenu(null)
    setSelectedNode(null)
  }, [nodes, connections, onNodesChange, onConnectionsChange])

  const handleAddNode = useCallback((type: MindMapNode['type'] = 'default') => {
    const rect = containerRef.current?.getBoundingClientRect()
    const centerX = rect ? (rect.width / 2 - pan.x) / scale : 400
    const centerY = rect ? (rect.height / 2 - pan.y) / scale : 300
    
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      x: centerX + Math.random() * 100 - 50,
      y: centerY + Math.random() * 100 - 50,
      title: type === 'character' ? '新角色' : type === 'scene' ? '新场景' : type === 'event' ? '新事件' : '新节点',
      color: NODE_COLORS[type],
      type,
    }
    
    onNodesChange([...nodes, newNode])
  }, [pan, scale, nodes, onNodesChange])

  const handleChangeNodeColor = useCallback((nodeId: string, color: string) => {
    onNodesChange(
      nodes.map((node) =>
        node.id === nodeId ? { ...node, color } : node
      )
    )
    setShowColorPicker(null)
  }, [nodes, onNodesChange])

  const handleChangeNodeType = useCallback((nodeId: string, type: MindMapNode['type']) => {
    onNodesChange(
      nodes.map((node) =>
        node.id === nodeId ? { ...node, type, color: NODE_COLORS[type] } : node
      )
    )
    setShowTypeMenu(null)
  }, [nodes, onNodesChange])

  const handleConnectionStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setDraggingConnection({
      from: nodeId,
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top - pan.y) / scale,
    })
  }, [pan, scale])

  const handleConnectionEnd = useCallback((targetNodeId: string) => {
    if (draggingConnection && draggingConnection.from !== targetNodeId) {
      const exists = connections.some(
        (conn) =>
          (conn.from === draggingConnection.from && conn.to === targetNodeId) ||
          (conn.from === targetNodeId && conn.to === draggingConnection.from)
      )
      
      if (!exists) {
        onConnectionsChange([
          ...connections,
          {
            id: `conn-${Date.now()}`,
            from: draggingConnection.from,
            to: targetNodeId,
          },
        ])
      }
    }
    setDraggingConnection(null)
  }, [draggingConnection, connections, onConnectionsChange])

  const handleResetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const getBezierPath = (from: MindMapNode, to: MindMapNode) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const controlOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5
    
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`
  }

  return (
    <div className={cn('relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden rounded-lg', className)}>
      <TooltipProvider>
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => {
            setContextMenu(null)
            setSelectedNode(null)
          }}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: draggingCanvas ? 'grabbing' : 'grab' }}
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3" />
              </filter>
            </defs>
            
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`} className="canvas-bg">
              {connections.map((conn) => {
                const fromNode = nodes.find((n) => n.id === conn.from)
                const toNode = nodes.find((n) => n.id === conn.to)
                if (!fromNode || !toNode) return null
                
                return (
                  <g key={conn.id}>
                    <path
                      d={getBezierPath(fromNode, toNode)}
                      fill="none"
                      stroke="url(#connectionGradient)"
                      strokeWidth="2"
                      className="transition-all duration-200"
                      opacity="0.6"
                    />
                    <path
                      d={getBezierPath(fromNode, toNode)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      className="cursor-pointer hover:opacity-100"
                      onClick={() => {
                        onConnectionsChange(connections.filter((c) => c.id !== conn.id))
                      }}
                    />
                  </g>
                )
              })}
              
              <defs>
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              
              {draggingConnection && (
                <line
                  x1={nodes.find((n) => n.id === draggingConnection.from)?.x}
                  y1={nodes.find((n) => n.id === draggingConnection.from)?.y}
                  x2={draggingConnection.x}
                  y2={draggingConnection.y}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.6"
                />
              )}
              
              {nodes.map((node) => {
                const Icon = NODE_ICONS[node.type]
                const isSelected = selectedNode === node.id
                const isEditing = editingNode === node.id
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-move"
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                    onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                    onMouseUp={() => handleConnectionEnd(node.id)}
                  >
                    <g filter="url(#shadow)">
                      <rect
                        x="-80"
                        y="-25"
                        width="160"
                        height="50"
                        rx="12"
                        fill={node.color}
                        opacity={isSelected ? 1 : 0.9}
                        className="transition-all duration-200"
                        style={{
                          filter: isSelected ? 'url(#glow)' : undefined,
                        }}
                      />
                    </g>
                    
                    <foreignObject x="-70" y="-20" width="140" height="40">
                      <div className="flex items-center justify-center h-full">
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditSubmit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSubmit()
                              if (e.key === 'Escape') {
                                setEditingNode(null)
                                setEditValue('')
                              }
                            }}
                            className="h-8 text-sm text-center bg-white/10 border-white/30 text-white"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-white">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-medium truncate max-w-[100px]">
                              {node.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                    
                    <circle
                      cx="70"
                      cy="0"
                      r="8"
                      fill="rgba(255,255,255,0.3)"
                      className="cursor-crosshair hover:fill-white/50 transition-colors"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleConnectionStart(e, node.id)
                      }}
                    />
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
        
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 border border-slate-700">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale((s) => Math.min(s * 1.2, 4))}
                  className="text-white hover:bg-slate-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>放大</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale((s) => Math.max(s * 0.8, 0.25))}
                  className="text-white hover:bg-slate-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>缩小</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetView}
                  className="text-white hover:bg-slate-700"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置视图</TooltipContent>
            </Tooltip>
          </div>
          
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 border border-slate-700">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddNode('character')}
                  className="text-blue-400 hover:bg-slate-700"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>添加角色</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddNode('scene')}
                  className="text-green-400 hover:bg-slate-700"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>添加场景</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddNode('event')}
                  className="text-orange-400 hover:bg-slate-700"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>添加事件</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddNode('default')}
                  className="text-purple-400 hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>添加节点</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {contextMenu && (
          <div
            className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 flex items-center gap-2"
              onClick={() => {
                const node = nodes.find((n) => n.id === contextMenu.nodeId)
                if (node) {
                  setEditingNode(node.id)
                  setEditValue(node.title)
                }
                setContextMenu(null)
              }}
            >
              <Edit className="w-4 h-4" />
              编辑标题
            </button>
            
            <Popover open={showColorPicker === contextMenu.nodeId} onOpenChange={(open) => setShowColorPicker(open ? contextMenu.nodeId : null)}>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 flex items-center gap-2">
                  <div className="w-4 h-4 rounded border border-white/30" style={{ backgroundColor: nodes.find((n) => n.id === contextMenu.nodeId)?.color }} />
                  更改颜色
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() => handleChangeNodeColor(contextMenu.nodeId, color)}
                    >
                      {nodes.find((n) => n.id === contextMenu.nodeId)?.color === color && (
                        <Check className="w-4 h-4 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover open={showTypeMenu === contextMenu.nodeId} onOpenChange={(open) => setShowTypeMenu(open ? contextMenu.nodeId : null)}>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  更改类型
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="space-y-1">
                  {(['character', 'scene', 'event', 'default'] as const).map((type) => {
                    const Icon = NODE_ICONS[type]
                    return (
                      <button
                        key={type}
                        className="w-full px-3 py-2 text-sm text-left text-white hover:bg-slate-700 rounded flex items-center gap-2"
                        onClick={() => handleChangeNodeType(contextMenu.nodeId, type)}
                      >
                        <Icon className="w-4 h-4" style={{ color: NODE_COLORS[type] }} />
                        {type === 'character' ? '角色' : type === 'scene' ? '场景' : type === 'event' ? '事件' : '默认'}
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
            
            <div className="border-t border-slate-700 my-1" />
            
            <button
              className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-slate-700 flex items-center gap-2"
              onClick={() => handleDeleteNode(contextMenu.nodeId)}
            >
              <Trash2 className="w-4 h-4" />
              删除节点
            </button>
          </div>
        )}
        
        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
          <div className="text-xs text-slate-400">
            节点: {nodes.length} | 连接: {connections.length} | 缩放: {Math.round(scale * 100)}%
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
