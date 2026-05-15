import { useEffect, useRef, useCallback, useState } from 'react'
import { useAppStore } from '@/lib/store'

interface Collaborator {
  userId: string
  userName: string
  color: string
  position?: { line: number; column: number }
}

export function useCollaboration(documentId: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const user = useAppStore(s => s.user)
  const serverConfig = useAppStore(s => s.serverConfig)

  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!serverConfig?.serverUrl || !documentId) return

    const wsUrl = serverConfig.serverUrl.replace(/^http/, 'ws') + '/ws'
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      ws.send(JSON.stringify({
        type: 'join',
        documentId,
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Anonymous',
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case 'room_state':
        case 'user_joined':
        case 'user_left':
          setCollaborators(msg.users || [])
          break
        case 'edit':
          console.log('Remote edit:', msg)
          break
        case 'cursor':
          setCollaborators(prev => prev.map(c =>
            c.userId === msg.userId
              ? { ...c, position: msg.position }
              : c
          ))
          break
      }
    }

    ws.onclose = () => setIsConnected(false)

    return () => {
      ws.send(JSON.stringify({ type: 'leave' }))
      ws.close()
    }
  }, [serverConfig?.serverUrl, documentId, user?.id])

  const sendEdit = useCallback((operation: unknown) => {
    wsRef.current?.send(JSON.stringify({ type: 'edit', operation }))
  }, [])

  const sendCursor = useCallback((position: { line: number; column: number }) => {
    wsRef.current?.send(JSON.stringify({ type: 'cursor', position }))
  }, [])

  return { collaborators, isConnected, sendEdit, sendCursor }
}
