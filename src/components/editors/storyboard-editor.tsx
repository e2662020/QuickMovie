'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type StoryElement, type BoardFile } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Trash2,
  Edit,
  MessageSquare,
  Users,
  MapPin,
  GitBranch,
  Eye,
  Grip,
  X,
  Save,
} from 'lucide-react'
import { IconPicker, IconDisplay } from '@/components/icon-picker'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface MindMapNode {
  id: string
  x: number
  y: number
  title: string
  color: string
  elementId: string
}

interface MindMapConnection {
  from: string
  to: string
}

interface CharacterData {
  description: string
  personality: string[]
  avatar: string
  backstory: string
  relationships: string
}

interface SceneData {
  description: string
  atmosphere: string
  timePeriod: string
  weather: string
  props: string
}

interface Comment {
  id: string
  author: string
  content: string
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const NODE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

const EMOJI_OPTIONS = [
  '👤', '👩', '👨', '👧', '👦', '🧑', '👱', '👲', '🧔', '👵', '👴',
  '👸', '🤴', '🧙', '🧛', '🦸', '🦹', '🥷', '🧝', '🧞', '🧟', '👻',
  '🤖', '👽', '🦊', '🐱', '🐺', '🦁', '🐉', '🦅', '🐍', '🐦', '🐺',
]

const ATTEMHERE_OPTIONS = [
  '明亮', '暗淡', '神秘', '紧张', '温馨', '冷峻', '欢快', '悲伤', '恐怖', '浪漫', '史诗',
]

const WEATHER_OPTIONS = [
  '晴天', '阴天', '雨天', '雪天', '雾天', '风暴', '台风', '彩虹', '夕阳', '月夜',
]

// ═══════════════════════════════════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════════════════════════════════

function getHeaders(token: string | null) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function fetchElements(
  boardId: string,
  type: string,
  token: string | null
): Promise<StoryElement[]> {
  const res = await fetch(
    `/api/boards/elements?boardId=${boardId}&type=${type}`,
    { headers: getHeaders(token) }
  )
  if (!res.ok) throw new Error('获取元素失败')
  const data = await res.json()
  return data.elements || []
}

async function createElement(
  boardId: string,
  type: string,
  name: string,
  token: string | null,
  extra?: { content?: string; color?: string; position?: string; fileId?: string | null }
): Promise<StoryElement> {
  const res = await fetch('/api/boards/elements', {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      boardId,
      type,
      name,
      ...extra,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '创建失败')
  }
  const data = await res.json()
  return data.element
}

async function updateElement(
  elementId: string,
  token: string | null,
  updates: { name?: string; content?: string; color?: string; position?: string }
): Promise<StoryElement> {
  const res = await fetch('/api/boards/elements', {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ elementId, ...updates }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '更新失败')
  }
  const data = await res.json()
  return data.element
}

async function deleteElement(
  elementId: string,
  token: string | null
): Promise<void> {
  const res = await fetch(
    `/api/boards/elements?elementId=${elementId}`,
    { method: 'DELETE', headers: getHeaders(token) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '删除失败')
  }
}

function parsePosition(pos: string | undefined): { x: number; y: number } {
  if (!pos) return { x: 0, y: 0 }
  try {
    return JSON.parse(pos)
  } catch {
    return { x: 0, y: 0 }
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

// ═══════════════════════════════════════════════════════════════════
// Tab 1: Story Mind Map
// ═══════════════════════════════════════════════════════════════════

function StoryMindMap({ boardId, token }: { boardId: string; token: string | null }) {
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [connections, setConnections] = useState<MindMapConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [newNodeTitle, setNewNodeTitle] = useState('')
  const [showNewNode, setShowNewNode] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // Load nodes
  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    fetchElements(boardId, 'mind_map', token)
      .then((elements) => {
        if (cancelled) return
        const mapNodes: MindMapNode[] = elements.map((el) => {
          const pos = parsePosition(el.position)
          return {
            id: el.id,
            x: pos.x || Math.random() * 600 + 50,
            y: pos.y || Math.random() * 400 + 50,
            title: el.name,
            color: el.color || NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
            elementId: el.id,
          }
        })
        setNodes(mapNodes)

        // Parse connections from element content
        const allConns: MindMapConnection[] = []
        elements.forEach((el) => {
          if (el.content) {
            try {
              const parsed = JSON.parse(el.content)
              if (Array.isArray(parsed.connections)) {
                parsed.connections.forEach((c: MindMapConnection) => {
                  allConns.push(c)
                })
              }
            } catch { /* ignore */ }
          }
        })
        setConnections(allConns)
      })
      .catch(() => {
        toast.error('加载思维导图失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [boardId, token])

  // Save connections to the first node (or create a dedicated node)
  const saveConnections = useCallback(async (conns: MindMapConnection[]) => {
    if (nodes.length === 0) return
    try {
      // Store connections in the first node's content
      const firstNode = nodes[0]
      await updateElement(firstNode.id, token, {
        content: JSON.stringify({ connections: conns }),
      })
    } catch {
      // Silent fail for connections
    }
  }, [nodes, token])

  // Add node
  const handleAddNode = useCallback(async () => {
    const title = newNodeTitle.trim() || `节点 ${nodes.length + 1}`
    try {
      const el = await createElement(boardId, 'mind_map', title, token, {
        color: NODE_COLORS[nodes.length % NODE_COLORS.length],
        position: JSON.stringify({ x: 100 + Math.random() * 400, y: 80 + Math.random() * 300 }),
      })
      const pos = parsePosition(el.position)
      const newNode: MindMapNode = {
        id: el.id,
        x: pos.x || 100 + Math.random() * 400,
        y: pos.y || 80 + Math.random() * 300,
        title: el.name,
        color: el.color || NODE_COLORS[nodes.length % NODE_COLORS.length],
        elementId: el.id,
      }
      setNodes((prev) => [...prev, newNode])
      setNewNodeTitle('')
      setShowNewNode(false)
      toast.success('节点已添加')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '添加失败')
    }
  }, [boardId, token, newNodeTitle, nodes.length])

  // Delete node
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    try {
      await deleteElement(nodeId, token)
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setConnections((prev) =>
        prev.filter((c) => c.from !== nodeId && c.to !== nodeId)
      )
      toast.success('节点已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }, [token])

  // Update node position
  const handleUpdatePosition = useCallback(async (nodeId: string, x: number, y: number) => {
    try {
      await updateElement(nodeId, token, {
        position: JSON.stringify({ x, y }),
      })
    } catch {
      // Silent fail
    }
  }, [token])

  // Update node title
  const handleUpdateTitle = useCallback(async (nodeId: string, title: string) => {
    try {
      await updateElement(nodeId, token, { name: title })
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, title } : n))
      )
      setEditingNode(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }, [token])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, node: MindMapNode) => {
    if (connectingFrom) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    setDraggingId(node.id)
    setDragOffset({
      x: e.clientX - svgRect.left - node.x,
      y: e.clientY - svgRect.top - node.y,
    })
  }, [connectingFrom])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const mx = e.clientX - svgRect.left
    const my = e.clientY - svgRect.top
    setMousePos({ x: mx, y: my })

    if (draggingId) {
      const newX = Math.max(0, Math.min(mx - dragOffset.x, 1200))
      const newY = Math.max(0, Math.min(my - dragOffset.y, 800))
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingId ? { ...n, x: newX, y: newY } : n))
      )
    }
  }, [draggingId, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      const node = nodes.find((n) => n.id === draggingId)
      if (node) {
        handleUpdatePosition(node.id, node.x, node.y)
      }
      setDraggingId(null)
    }
    if (connectingFrom) {
      setConnectingFrom(null)
    }
  }, [draggingId, connectingFrom, nodes, handleUpdatePosition])

  // Connection mode: right-click / double-click on node to start connection
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        const exists = connections.some(
          (c) =>
            (c.from === connectingFrom && c.to === nodeId) ||
            (c.from === nodeId && c.to === connectingFrom)
        )
        if (!exists) {
          const newConns = [...connections, { from: connectingFrom, to: nodeId }]
          setConnections(newConns)
          saveConnections(newConns)
          toast.success('连接已创建')
        }
      }
      setConnectingFrom(null)
    }
  }, [connectingFrom, connections, saveConnections])

  // Start connection from a node
  const handleStartConnect = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (connectingFrom === nodeId) {
      setConnectingFrom(null)
    } else {
      setConnectingFrom(nodeId)
    }
  }, [connectingFrom])

  // Empty state
  if (!loading && nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <GitBranch className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">故事导图</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              创建节点来构建你的故事结构
            </p>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Input
              value={newNodeTitle}
              onChange={(e) => setNewNodeTitle(e.target.value)}
              placeholder="输入节点名称..."
              className="w-48 h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            />
            <Button size="sm" onClick={handleAddNode} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              添加
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            placeholder="新节点名称..."
            className="w-48 h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            onFocus={() => setShowNewNode(true)}
          />
          <Button size="sm" onClick={handleAddNode} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            添加节点
          </Button>
        </div>
        {connectingFrom && (
          <Badge variant="outline" className="text-xs gap-1">
            <GitBranch className="h-3 w-3" />
            点击目标节点完成连接 · 按 Esc 取消
          </Badge>
        )}
        <Button
          size="sm"
          variant={connectingFrom ? 'default' : 'ghost'}
          className="h-8 gap-1.5 text-xs"
          onClick={() => setConnectingFrom(connectingFrom ? null : '')}
        >
          <GitBranch className="h-3.5 w-3.5" />
          连接模式
        </Button>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 overflow-auto bg-muted/20 p-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="h-full w-full min-h-[600px] min-w-[800px]"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDoubleClick={() => {
              if (connectingFrom) setConnectingFrom(null)
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Connection lines */}
            {connections.map((conn, i) => {
              const fromNode = nodes.find((n) => n.id === conn.from)
              const toNode = nodes.find((n) => n.id === conn.to)
              if (!fromNode || !toNode) return null
              return (
                <line
                  key={`conn-${i}`}
                  x1={fromNode.x + 60}
                  y1={fromNode.y + 20}
                  x2={toNode.x + 60}
                  y2={toNode.y + 20}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  markerEnd="url(#arrowhead)"
                  opacity={0.6}
                />
              )
            })}

            {/* Connecting line preview */}
            {connectingFrom && (() => {
              const fromNode = nodes.find((n) => n.id === connectingFrom)
              if (!fromNode) return null
              return (
                <line
                  x1={fromNode.x + 60}
                  y1={fromNode.y + 20}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  opacity={0.8}
                />
              )
            })()}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleMouseDown(e, node)}
                onDoubleClick={() => handleNodeDoubleClick(node.id)}
                className={cn(
                  'cursor-grab select-none',
                  draggingId === node.id && 'cursor-grabbing',
                  connectingFrom === node.id && 'ring-2 ring-blue-400 ring-offset-2 rounded-lg'
                )}
                style={{ filter: draggingId === node.id ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none' }}
              >
                {/* Node rectangle */}
                <rect
                  x={0}
                  y={0}
                  width={120}
                  height={40}
                  rx={8}
                  ry={8}
                  fill={node.color}
                  opacity={0.9}
                  stroke={connectingFrom === node.id ? '#3b82f6' : 'rgba(255,255,255,0.2)'}
                  strokeWidth={connectingFrom === node.id ? 2 : 1}
                />

                {/* Node title */}
                {editingNode === node.id ? (
                  <foreignObject x={4} y={4} width={112} height={32}>
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleUpdateTitle(node.id, editingTitle || node.title)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle(node.id, editingTitle || node.title)
                        if (e.key === 'Escape') setEditingNode(null)
                      }}
                      className="w-full h-full bg-white/90 rounded px-1 text-xs text-center outline-none text-gray-900"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={60}
                    y={22}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={12}
                    fontWeight={500}
                    className="pointer-events-none"
                  >
                    {node.title.length > 10 ? node.title.slice(0, 10) + '…' : node.title}
                  </text>
                )}

                {/* Edit button */}
                <g
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingNode(node.id)
                    setEditingTitle(node.title)
                  }}
                  className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  style={{ opacity: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
                >
                  <circle cx={108} cy={8} r={8} fill="rgba(255,255,255,0.3)" />
                  <text x={108} y={8} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10}>
                    ✏️
                  </text>
                </g>

                {/* Connect button */}
                <g
                  onClick={(e) => handleStartConnect(e, node.id)}
                  className="cursor-pointer"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = connectingFrom === node.id ? '1' : '0.5' }}
                >
                  <circle cx={108} cy={32} r={8} fill="rgba(255,255,255,0.3)" />
                  <text x={108} y={32} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10}>
                    🔗
                  </text>
                </g>

                {/* Delete button */}
                <g
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNode(node.id)
                  }}
                  className="cursor-pointer"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}
                >
                  <circle cx={12} cy={8} r={8} fill="rgba(239,68,68,0.7)" />
                  <text x={12} y={8} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10}>
                    ✕
                  </text>
                </g>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t px-4 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Grip className="h-3 w-3" /> 拖拽移动</span>
        <span>双击完成连接</span>
        <span>点击🔗图标开始连接</span>
        <span className="ml-auto">{nodes.length} 个节点 · {connections.length} 条连线</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab 2: Story Segments
// ═══════════════════════════════════════════════════════════════════

function StorySegments({ boardId, token }: { boardId: string; token: string | null }) {
  const [segments, setSegments] = useState<StoryElement[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  // Comments state stored in local state per segment
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const [newCommentMap, setNewCommentMap] = useState<Record<string, string>>({})

  // Load segments
  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    fetchElements(boardId, 'story_segment', token)
      .then((elements) => {
        if (cancelled) return
        setSegments(elements)
        // Parse comments from content
        const cmap: Record<string, Comment[]> = {}
        elements.forEach((el) => {
          if (el.content) {
            try {
              const parsed = JSON.parse(el.content)
              cmap[el.id] = parsed.comments || []
            } catch {
              cmap[el.id] = []
            }
          } else {
            cmap[el.id] = []
          }
        })
        setCommentsMap(cmap)
      })
      .catch(() => toast.error('加载故事片段失败'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [boardId, token])

  // Extract text content from story_segment
  const getSegmentText = (el: StoryElement): string => {
    if (!el.content) return ''
    try {
      const parsed = JSON.parse(el.content)
      return parsed.text || ''
    } catch {
      return el.content
    }
  }

  // Create segment
  const handleCreate = useCallback(async () => {
    const title = newTitle.trim() || `片段 ${segments.length + 1}`
    try {
      const el = await createElement(boardId, 'story_segment', title, token, {
        content: JSON.stringify({ text: newContent, comments: [] }),
      })
      setSegments((prev) => [...prev, el])
      setCommentsMap((prev) => ({ ...prev, [el.id]: [] }))
      setShowCreateDialog(false)
      setNewTitle('')
      setNewContent('')
      toast.success('片段已创建')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    }
  }, [boardId, token, newTitle, newContent, segments.length])

  // Update segment
  const handleUpdate = useCallback(async (id: string) => {
    try {
      const comments = commentsMap[id] || []
      await updateElement(id, token, {
        name: editTitle,
        content: JSON.stringify({ text: editContent, comments }),
      })
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: editTitle, content: JSON.stringify({ text: editContent, comments }) } : s))
      )
      setEditingId(null)
      toast.success('片段已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    }
  }, [token, editTitle, editContent, commentsMap])

  // Delete segment
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteElement(id, token)
      setSegments((prev) => prev.filter((s) => s.id !== id))
      setCommentsMap((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (expandedId === id) setExpandedId(null)
      toast.success('片段已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }, [token, expandedId])

  // Add comment
  const handleAddComment = useCallback(async (segmentId: string) => {
    const text = (newCommentMap[segmentId] || '').trim()
    if (!text) return
    const newComment: Comment = {
      id: generateId(),
      author: '我',
      content: text,
      createdAt: new Date().toISOString(),
    }
    const updated = [...(commentsMap[segmentId] || []), newComment]
    setCommentsMap((prev) => ({ ...prev, [segmentId]: updated }))
    setNewCommentMap((prev) => ({ ...prev, [segmentId]: '' }))

    // Save to element content
    const segment = segments.find((s) => s.id === segmentId)
    if (segment) {
      try {
        await updateElement(segmentId, token, {
          content: JSON.stringify({ text: getSegmentText(segment), comments: updated }),
        })
      } catch { /* silent */ }
    }
  }, [commentsMap, newCommentMap, segments, token])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm text-muted-foreground">{segments.length} 个片段</span>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          新建片段
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">暂无故事片段</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                创建片段来组织你的故事内容
              </p>
            </div>
          ) : (
            segments.map((segment) => {
              const isEditing = editingId === segment.id
              const isExpanded = expandedId === segment.id
              const comments = commentsMap[segment.id] || []
              const text = isEditing ? editContent : getSegmentText(segment)

              return (
                <Card key={segment.id} className="overflow-hidden">
                  <CardHeader className="px-4 py-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-8 text-sm font-semibold"
                            placeholder="片段标题"
                          />
                        ) : (
                          <CardTitle
                            className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setExpandedId(isExpanded ? null : segment.id)}
                          >
                            {segment.name}
                          </CardTitle>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(segment.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleUpdate(segment.id)}
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingId(segment.id)
                                setEditTitle(segment.name)
                                setEditContent(getSegmentText(segment))
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(segment.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-3">
                    {isEditing ? (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="写下故事片段内容..."
                        className="min-h-[120px] text-sm resize-y"
                      />
                    ) : (
                      <>
                        {/* Content preview */}
                        <p
                          className={cn(
                            'text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer',
                            !isExpanded && 'line-clamp-3'
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : segment.id)}
                        >
                          {text || <span className="italic">暂无内容</span>}
                        </p>

                        {/* Expand indicator */}
                        {text && text.split('\n').length > 3 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : segment.id)}
                            className="mt-1 text-xs text-primary hover:underline"
                          >
                            {isExpanded ? '收起' : '展开全部'}
                          </button>
                        )}

                        {/* Comments section */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                评论 ({comments.length})
                              </span>
                            </div>

                            {/* Existing comments */}
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="rounded-md bg-muted/50 px-3 py-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">{comment.author}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(comment.createdAt).toLocaleString('zh-CN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{comment.content}</p>
                              </div>
                            ))}

                            {/* Add comment */}
                            <div className="flex gap-2">
                              <Input
                                value={newCommentMap[segment.id] || ''}
                                onChange={(e) =>
                                  setNewCommentMap((prev) => ({
                                    ...prev,
                                    [segment.id]: e.target.value,
                                  }))
                                }
                                placeholder="添加评论..."
                                className="h-8 text-xs"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(segment.id)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 shrink-0"
                                onClick={() => handleAddComment(segment.id)}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Comment count badge when collapsed */}
                        {!isExpanded && comments.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <MessageSquare className="h-2.5 w-2.5" />
                              {comments.length} 条评论
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              新建故事片段
            </DialogTitle>
            <DialogDescription>
              创建一个新的故事片段，描述故事的一个段落或情节点。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">标题</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="如：开场 · 命运的邂逅"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">内容</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="详细描述这个片段的故事内容..."
                className="min-h-[160px] resize-y text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() && !newContent.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab 3: Character OCs
// ═══════════════════════════════════════════════════════════════════

function CharacterOCs({ boardId, token }: { boardId: string; token: string | null }) {
  const [characters, setCharacters] = useState<StoryElement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<StoryElement | null>(null)
  const [formName, setFormName] = useState('')
  const [formAvatar, setFormAvatar] = useState('👤')
  const [formDescription, setFormDescription] = useState('')
  const [formPersonality, setFormPersonality] = useState<string[]>([])
  const [formBackstory, setFormBackstory] = useState('')
  const [formRelationships, setFormRelationships] = useState('')
  const [personalityInput, setPersonalityInput] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid')
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)

  // Parse character data
  const parseCharacter = (el: StoryElement): CharacterData => {
    if (!el.content) return { description: '', personality: [], avatar: '👤', backstory: '', relationships: '' }
    try {
      return {
        description: '',
        personality: [],
        avatar: '👤',
        backstory: '',
        relationships: '',
        ...JSON.parse(el.content),
      }
    } catch {
      return { description: '', personality: [], avatar: '👤', backstory: '', relationships: '' }
    }
  }

  // Load characters
  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    fetchElements(boardId, 'character', token)
      .then((elements) => {
        if (cancelled) return
        setCharacters(elements)
      })
      .catch(() => toast.error('加载角色失败'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [boardId, token])

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('')
    setFormAvatar('👤')
    setFormDescription('')
    setFormPersonality([])
    setFormBackstory('')
    setFormRelationships('')
    setPersonalityInput('')
    setEditingChar(null)
  }, [])

  // Open create dialog
  const openCreate = useCallback(() => {
    resetForm()
    setDialogOpen(true)
  }, [resetForm])

  // Open edit dialog
  const openEdit = useCallback((char: StoryElement) => {
    const data = parseCharacter(char)
    setEditingChar(char)
    setFormName(char.name)
    setFormAvatar(data.avatar)
    setFormDescription(data.description)
    setFormPersonality(data.personality)
    setFormBackstory(data.backstory)
    setFormRelationships(data.relationships)
    setDialogOpen(true)
  }, [])

  // Save character
  const handleSave = useCallback(async () => {
    const name = formName.trim()
    if (!name) {
      toast.error('请输入角色名称')
      return
    }

    const content: CharacterData = {
      avatar: formAvatar,
      description: formDescription,
      personality: formPersonality,
      backstory: formBackstory,
      relationships: formRelationships,
    }

    try {
      if (editingChar) {
        const updated = await updateElement(editingChar.id, token, {
          name,
          content: JSON.stringify(content),
        })
        setCharacters((prev) =>
          prev.map((c) => (c.id === editingChar.id ? { ...c, ...updated, name, content: JSON.stringify(content) } : c))
        )
        toast.success('角色已更新')
      } else {
        const el = await createElement(boardId, 'character', name, token, {
          content: JSON.stringify(content),
        })
        setCharacters((prev) => [...prev, el])
        toast.success('角色已创建')
      }
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }, [editingChar, formName, formAvatar, formDescription, formPersonality, formBackstory, formRelationships, boardId, token, resetForm])

  // Delete character
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteElement(id, token)
      setCharacters((prev) => prev.filter((c) => c.id !== id))
      if (selectedCharId === id) setSelectedCharId(null)
      toast.success('角色已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }, [token, selectedCharId])

  // Add personality trait
  const addPersonality = useCallback((trait: string) => {
    const trimmed = trait.trim()
    if (trimmed && !formPersonality.includes(trimmed)) {
      setFormPersonality((prev) => [...prev, trimmed])
    }
    setPersonalityInput('')
  }, [formPersonality])

  const selectedChar = characters.find((c) => c.id === selectedCharId)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{characters.length} 个角色</span>
          <div className="flex rounded-md border">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-7 px-2 rounded-r-none text-xs"
              onClick={() => setViewMode('grid')}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'detail' ? 'secondary' : 'ghost'}
              className="h-7 px-2 rounded-l-none text-xs"
              onClick={() => setViewMode('detail')}
            >
              <Users className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          新建角色
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">暂无角色</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                创建角色卡片来管理你的角色设定
              </p>
              <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                创建第一个角色
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {characters.map((char) => {
                const data = parseCharacter(char)
                return (
                  <Card
                    key={char.id}
                    className="group overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedCharId(char.id)
                      setViewMode('detail')
                    }}
                  >
                    {/* Avatar area */}
                    <div className="relative flex items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40 py-6">
                      <IconDisplay value={data.avatar} fallback="👤" size="lg" />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(char)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 w-6 p-0 rounded-full text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(char.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="text-sm font-semibold truncate">{char.name}</h3>
                      {data.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {data.description}
                        </p>
                      )}
                      {data.personality.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {data.personality.slice(0, 3).map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {p}
                            </Badge>
                          ))}
                          {data.personality.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{data.personality.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Detail View */
            <div className="space-y-4">
              {characters.map((char) => {
                const data = parseCharacter(char)
                const isSelected = selectedCharId === char.id
                return (
                  <Card
                    key={char.id}
                    className={cn(
                      'overflow-hidden transition-colors cursor-pointer',
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => setSelectedCharId(isSelected ? null : char.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Avatar */}
                        <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 shrink-0">
                          <IconDisplay value={data.avatar} fallback="👤" size="lg" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{char.name}</h3>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(char)
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(char.id)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {data.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {data.description}
                            </p>
                          )}

                          {data.personality.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {data.personality.map((p, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-4 space-y-3 pt-3 border-t">
                          {data.backstory && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1">背景故事</h4>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.backstory}</p>
                            </div>
                          )}
                          {data.relationships && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground mb-1">人物关系</h4>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.relationships}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm()
        setDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              {editingChar ? '编辑角色' : '新建角色'}
            </DialogTitle>
            <DialogDescription>
              {editingChar ? '修改角色的设定信息。' : '创建一个新的角色设定。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Avatar picker */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">头像</Label>
              <IconPicker
                value={formAvatar}
                onChange={setFormAvatar}
                emojis={EMOJI_OPTIONS}
                size="lg"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">角色名称</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="输入角色名称"
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">角色描述</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="简要描述角色的外貌特征和基本信息..."
                className="min-h-[80px] text-sm resize-y"
              />
            </div>

            {/* Personality */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">性格特征</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formPersonality.map((p, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1 text-xs">
                    {p}
                    <button
                      type="button"
                      className="ml-0.5 h-3.5 w-3.5 flex items-center justify-center rounded-full hover:bg-muted-foreground/20"
                      onClick={() => setFormPersonality((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={personalityInput}
                  onChange={(e) => setPersonalityInput(e.target.value)}
                  placeholder="输入性格特征后按回车"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPersonality(personalityInput)
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => addPersonality(personalityInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Backstory */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">背景故事</Label>
              <Textarea
                value={formBackstory}
                onChange={(e) => setFormBackstory(e.target.value)}
                placeholder="描述角色的背景故事..."
                className="min-h-[80px] text-sm resize-y"
              />
            </div>

            {/* Relationships */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">人物关系</Label>
              <Textarea
                value={formRelationships}
                onChange={(e) => setFormRelationships(e.target.value)}
                placeholder="描述该角色与其他角色的关系..."
                className="min-h-[60px] text-sm resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              <Save className="mr-1.5 h-4 w-4" />
              {editingChar ? '保存修改' : '创建角色'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Tab 4: Scenes/Locations
// ═══════════════════════════════════════════════════════════════════

function ScenesLocations({ boardId, token }: { boardId: string; token: string | null }) {
  const [scenes, setScenes] = useState<StoryElement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<StoryElement | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAtmosphere, setFormAtmosphere] = useState('')
  const [formTimePeriod, setFormTimePeriod] = useState('')
  const [formWeather, setFormWeather] = useState('')
  const [formProps, setFormProps] = useState('')

  // Parse scene data
  const parseScene = (el: StoryElement): SceneData => {
    if (!el.content) return { description: '', atmosphere: '', timePeriod: '', weather: '', props: '' }
    try {
      return {
        description: '',
        atmosphere: '',
        timePeriod: '',
        weather: '',
        props: '',
        ...JSON.parse(el.content),
      }
    } catch {
      return { description: '', atmosphere: '', timePeriod: '', weather: '', props: '' }
    }
  }

  // Load scenes
  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    fetchElements(boardId, 'scene', token)
      .then((elements) => {
        if (cancelled) return
        setScenes(elements)
      })
      .catch(() => toast.error('加载场景失败'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [boardId, token])

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('')
    setFormDescription('')
    setFormAtmosphere('')
    setFormTimePeriod('')
    setFormWeather('')
    setFormProps('')
    setEditingScene(null)
  }, [])

  // Open create
  const openCreate = useCallback(() => {
    resetForm()
    setDialogOpen(true)
  }, [resetForm])

  // Open edit
  const openEdit = useCallback((scene: StoryElement) => {
    const data = parseScene(scene)
    setEditingScene(scene)
    setFormName(scene.name)
    setFormDescription(data.description)
    setFormAtmosphere(data.atmosphere)
    setFormTimePeriod(data.timePeriod)
    setFormWeather(data.weather)
    setFormProps(data.props)
    setDialogOpen(true)
  }, [])

  // Save scene
  const handleSave = useCallback(async () => {
    const name = formName.trim()
    if (!name) {
      toast.error('请输入场景名称')
      return
    }

    const content: SceneData = {
      description: formDescription,
      atmosphere: formAtmosphere,
      timePeriod: formTimePeriod,
      weather: formWeather,
      props: formProps,
    }

    try {
      if (editingScene) {
        const updated = await updateElement(editingScene.id, token, {
          name,
          content: JSON.stringify(content),
        })
        setScenes((prev) =>
          prev.map((s) => (s.id === editingScene.id ? { ...s, ...updated, name, content: JSON.stringify(content) } : s))
        )
        toast.success('场景已更新')
      } else {
        const el = await createElement(boardId, 'scene', name, token, {
          content: JSON.stringify(content),
        })
        setScenes((prev) => [...prev, el])
        toast.success('场景已创建')
      }
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }, [editingScene, formName, formDescription, formAtmosphere, formTimePeriod, formWeather, formProps, boardId, token, resetForm])

  // Delete scene
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteElement(id, token)
      setScenes((prev) => prev.filter((s) => s.id !== id))
      toast.success('场景已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }, [token])

  // Color based on atmosphere
  const getAtmosphereColor = (atmosphere: string): string => {
    const map: Record<string, string> = {
      '明亮': 'from-amber-100 to-yellow-50 dark:from-amber-950 dark:to-yellow-950',
      '暗淡': 'from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900',
      '神秘': 'from-purple-100 to-indigo-50 dark:from-purple-950 dark:to-indigo-950',
      '紧张': 'from-red-100 to-orange-50 dark:from-red-950 dark:to-orange-950',
      '温馨': 'from-pink-100 to-rose-50 dark:from-pink-950 dark:to-rose-950',
      '冷峻': 'from-cyan-100 to-blue-50 dark:from-cyan-950 dark:to-blue-950',
      '欢快': 'from-green-100 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
      '悲伤': 'from-gray-200 to-blue-100 dark:from-gray-800 dark:to-blue-900',
      '恐怖': 'from-gray-300 to-gray-200 dark:from-gray-900 dark:to-gray-800',
      '浪漫': 'from-rose-100 to-pink-50 dark:from-rose-950 dark:to-pink-950',
      '史诗': 'from-amber-200 to-orange-100 dark:from-amber-900 dark:to-orange-950',
    }
    return map[atmosphere] || 'from-muted to-muted/50'
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm text-muted-foreground">{scenes.length} 个场景</span>
        <Button size="sm" onClick={openCreate} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          新建场景
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {scenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <MapPin className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">暂无场景</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                创建场景卡片来管理你的故事地点
              </p>
              <Button size="sm" onClick={openCreate} className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                创建第一个场景
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene) => {
                const data = parseScene(scene)
                const gradientColor = getAtmosphereColor(data.atmosphere)
                return (
                  <Card
                    key={scene.id}
                    className="group overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Gradient header based on atmosphere */}
                    <div className={cn('relative px-4 py-4 bg-gradient-to-br', gradientColor)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <h3 className="text-sm font-semibold truncate">{scene.name}</h3>
                          </div>
                          {data.timePeriod && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {data.timePeriod}
                              {data.weather && ` · ${data.weather}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={() => openEdit(scene)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 w-6 p-0 rounded-full text-destructive hover:text-destructive"
                            onClick={() => handleDelete(scene.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-3 space-y-2">
                      {data.atmosphere && (
                        <Badge variant="secondary" className="text-[10px]">
                          {data.atmosphere}
                        </Badge>
                      )}

                      {data.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                          {data.description}
                        </p>
                      )}

                      {data.props && (
                        <div className="pt-1 border-t">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">关键道具</p>
                          <p className="text-[11px] text-muted-foreground/80 line-clamp-2">{data.props}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm()
        setDialogOpen(open)
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              {editingScene ? '编辑场景' : '新建场景'}
            </DialogTitle>
            <DialogDescription>
              {editingScene ? '修改场景的设定信息。' : '创建一个新的故事场景/地点。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">场景名称</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="如：废弃空间站 · 指挥中心"
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">场景描述</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="详细描述这个场景的环境、布局、视觉特点..."
                className="min-h-[100px] text-sm resize-y"
              />
            </div>

            {/* Atmosphere */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">氛围</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ATTEMHERE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs border transition-colors',
                      formAtmosphere === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => setFormAtmosphere(formAtmosphere === opt ? '' : opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <Input
                value={formAtmosphere}
                onChange={(e) => setFormAtmosphere(e.target.value)}
                placeholder="或自定义氛围..."
                className="h-8 text-sm"
              />
            </div>

            {/* Time Period & Weather */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">时间</Label>
                <Input
                  value={formTimePeriod}
                  onChange={(e) => setFormTimePeriod(e.target.value)}
                  placeholder="如：现代、古代、未来"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">天气</Label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {WEATHER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] border transition-colors',
                        formWeather === opt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => setFormWeather(formWeather === opt ? '' : opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  value={formWeather}
                  onChange={(e) => setFormWeather(e.target.value)}
                  placeholder="或自定义..."
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Props */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">关键道具</Label>
              <Textarea
                value={formProps}
                onChange={(e) => setFormProps(e.target.value)}
                placeholder="该场景中重要的道具、物品..."
                className="min-h-[60px] text-sm resize-y"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              <Save className="mr-1.5 h-4 w-4" />
              {editingScene ? '保存修改' : '创建场景'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Main Component: StoryboardEditor
// ═══════════════════════════════════════════════════════════════════

export function StoryboardEditor() {
  const { currentBoard, currentFile, token } = useAppStore()
  const [activeTab, setActiveTab] = useState('mindmap')

  // No board guard
  if (!currentBoard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">请选择一个导演板</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4.5 w-4.5 text-emerald-500" />
          <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
            {currentFile?.name || '故事板'}
          </h2>
          {currentFile && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
              {currentBoard.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="mindmap" className="gap-1.5 text-xs sm:text-sm">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">故事导图</span>
              <span className="sm:hidden">导图</span>
            </TabsTrigger>
            <TabsTrigger value="segments" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">故事片段</span>
              <span className="sm:hidden">片段</span>
            </TabsTrigger>
            <TabsTrigger value="characters" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">角色OC</span>
              <span className="sm:hidden">角色</span>
            </TabsTrigger>
            <TabsTrigger value="scenes" className="gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">地名场景</span>
              <span className="sm:hidden">场景</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="mindmap" className="flex-1 overflow-hidden mt-0">
          <StoryMindMap boardId={currentBoard.id} token={token} />
        </TabsContent>

        <TabsContent value="segments" className="flex-1 overflow-hidden mt-0">
          <StorySegments boardId={currentBoard.id} token={token} />
        </TabsContent>

        <TabsContent value="characters" className="flex-1 overflow-hidden mt-0">
          <CharacterOCs boardId={currentBoard.id} token={token} />
        </TabsContent>

        <TabsContent value="scenes" className="flex-1 overflow-hidden mt-0">
          <ScenesLocations boardId={currentBoard.id} token={token} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
