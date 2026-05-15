import { localStore } from './localStore'
import { useAppStore } from './store'

class DataAdapter {
  private get apiBase() {
    const { appMode, serverConfig } = useAppStore.getState()
    return appMode === 'remote' ? serverConfig?.serverUrl + '/api' : null
  }

  async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const { appMode } = useAppStore.getState()

    if (appMode === 'remote') {
      const base = this.apiBase
      if (!base) throw new Error('No server configured')

      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `API error: ${res.status}`)
      }

      return res.json()
    }

    return this.handleOfflineRequest(path, options) as Promise<T>
  }

  private async handleOfflineRequest(path: string, options?: RequestInit): Promise<unknown> {
    const url = new URL(path, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)

    if (parts.length < 2 || parts[0] !== 'api') {
      throw new Error(`[offline] Unsupported path: ${path}`)
    }

    const resource = parts[1]
    const method = (options?.method || 'GET').toUpperCase()

    switch (resource) {
      case 'teams': {
        if (parts.length === 2 && method === 'GET') {
          const items = await localStore.getAll('teams')
          return { teams: items.map((i) => i.data) }
        }
        if (parts.length === 2 && method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}')
          const team = {
            id: crypto.randomUUID(),
            name: body.name || 'Untitled',
            icon: body.icon || '🎬',
            inviteCode: this.generateInviteCode(),
            ownerId: 'local-user',
            role: 'owner',
            memberCount: 1,
          }
          await localStore.put('teams', team.id, team)
          return { team }
        }
        if (parts.length === 2 && method === 'PATCH') {
          const body = JSON.parse(options?.body as string || '{}')
          const existing = await localStore.get('teams', body.teamId)
          if (!existing) throw new Error('Team not found')
          const updated = {
            ...(existing.data as Record<string, unknown>),
            name: body.name ?? (existing.data as Record<string, unknown>).name,
            icon: body.icon ?? (existing.data as Record<string, unknown>).icon,
          }
          await localStore.put('teams', body.teamId, updated)
          return { team: updated }
        }
        if (parts.length === 2 && method === 'DELETE') {
          const teamId = url.searchParams.get('teamId')
          if (!teamId) throw new Error('Missing teamId')
          await localStore.delete('teams', teamId)
          return { success: true }
        }
        if (parts[2] === 'join') {
          if (method === 'GET') {
            const teamId = url.searchParams.get('teamId')
            if (!teamId) throw new Error('Missing teamId')
            const members = await localStore.getAll('members')
            const filtered = members.filter(
              (i) => (i.data as Record<string, unknown>).teamId === teamId
            )
            return { members: filtered.map((i) => i.data) }
          }
          if (method === 'PATCH') {
            const body = JSON.parse(options?.body as string || '{}')
            const members = await localStore.getAll('members')
            const target = members.find(
              (i) =>
                (i.data as Record<string, unknown>).teamId === body.teamId &&
                (i.data as Record<string, unknown>).userId === body.userId
            )
            if (target) {
              const updated = {
                ...(target.data as Record<string, unknown>),
                role: body.role,
              }
              await localStore.put('members', target.id, updated)
            }
            return { success: true }
          }
          if (method === 'DELETE') {
            const teamId = url.searchParams.get('teamId')
            const userId = url.searchParams.get('userId')
            if (!teamId || !userId) throw new Error('Missing params')
            const members = await localStore.getAll('members')
            const target = members.find(
              (i) =>
                (i.data as Record<string, unknown>).teamId === teamId &&
                (i.data as Record<string, unknown>).userId === userId
            )
            if (target) {
              await localStore.delete('members', target.id)
            }
            return { success: true }
          }
          throw new Error(`[offline] Unsupported teams/join operation: ${method}`)
        }
        throw new Error(`[offline] Unsupported teams operation: ${method}`)
      }

      case 'boards': {
        if (method === 'GET') {
          const teamId = url.searchParams.get('teamId')
          const items = await localStore.getAll('boards')
          if (teamId) {
            const filtered = items.filter(
              (i) => (i.data as Record<string, unknown>).teamId === teamId
            )
            return { boards: filtered.map((i) => i.data) }
          }
          return { boards: items.map((i) => i.data) }
        }
        if (method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}')
          const board = {
            id: crypto.randomUUID(),
            name: body.name || 'Untitled',
            teamId: body.teamId || '',
            createdBy: 'local-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await localStore.put('boards', board.id, board)
          return { board }
        }
        if (method === 'PATCH') {
          const body = JSON.parse(options?.body as string || '{}')
          const existing = await localStore.get('boards', body.boardId)
          if (!existing) throw new Error('Board not found')
          const updated = {
            ...(existing.data as Record<string, unknown>),
            name: body.name ?? (existing.data as Record<string, unknown>).name,
            updatedAt: new Date().toISOString(),
          }
          await localStore.put('boards', body.boardId, updated)
          return { board: updated }
        }
        if (method === 'DELETE') {
          const boardId = url.searchParams.get('boardId')
          if (!boardId) throw new Error('Missing boardId')
          await localStore.delete('boards', boardId)
          return { success: true }
        }
        throw new Error(`[offline] Unsupported boards operation: ${method}`)
      }

      case 'auth': {
        if (parts[2] === 'login' && method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}')
          const users = await localStore.getAll('users')
          const found = users.find((i) => (i.data as Record<string, unknown>).email === body.email)
          if (found) {
            return {
              user: found.data,
              token: 'offline-token-' + Date.now(),
            }
          }
          throw new Error('用户不存在')
        }
        if (parts[2] === 'register' && method === 'POST') {
          const body = JSON.parse(options?.body as string || '{}')
          const user = {
            id: crypto.randomUUID(),
            email: body.email || '',
            name: body.name || body.email?.split('@')[0] || 'User',
            avatar: undefined,
            roles: ['user'],
          }
          await localStore.put('users', user.id, user)
          return {
            user,
            token: 'offline-token-' + Date.now(),
          }
        }
        if (parts[2] === 'logout' && method === 'POST') {
          return { success: true }
        }
        if (parts[2] === 'me' && method === 'GET') {
          const users = await localStore.getAll('users')
          if (users.length > 0) {
            return { user: users[0].data }
          }
          return { user: null }
        }
        throw new Error(`[offline] Unsupported auth operation: ${parts[2]}`)
      }

      case 'health': {
        return { status: 'ok', mode: 'offline' }
      }

      default:
        throw new Error(`[offline] Unknown resource: ${resource}`)
    }
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
}

export const dataAdapter = new DataAdapter()
