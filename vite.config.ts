import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// Build modes:
// - development: Vite dev server + mock API plugin, port 3000
// - production: Static build for deployment, no mock API
// - tauri: Frontend build for Tauri desktop app, no mock API

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function loadTestAccounts(): Array<{ username: string; password: string; roles: string[]; status: boolean }> {
  const accountFile = path.resolve(__dirname, './TestAccount.json')
  try {
    const content = fs.readFileSync(accountFile, 'utf-8')
    const jsonContent = content.replace(/\/\/.*$/gm, '').trim()
    return JSON.parse(jsonContent)
  } catch {
    return [
      { username: 'admin@quickmovie.cn', password: '123456', roles: ['admin'], status: false },
      { username: 'demo@quickmovie.cn', password: '123456', roles: ['user'], status: false },
    ]
  }
}

function mockAPIPlugin(): Plugin {
  const now = new Date().toISOString()

  interface DBUser { id: string; email: string; name: string; password: string; roles: string[] }
  interface DBTeam { id: string; name: string; icon: string; inviteCode: string; ownerId: string }
  interface DBMember { userId: string; name: string; email: string; role: string; joinedAt: string }
  interface DBBoard { id: string; name: string; teamId: string; createdBy: string; createdAt: string; updatedAt: string }
  interface DBFile { id: string; boardId: string; parentId: string | null; name: string; type: string; content: string; sortOrder: number; createdAt: string; updatedAt: string }
  interface DBElement { id: string; boardId: string; fileId: string | null; type: string; name: string; content: string; color: string; position: string | null; createdAt: string; updatedAt: string }
  interface DBResource { id: string; boardId: string; fileId: string | null; name: string; type: string; url: string; originalUrl: string | null; size: number; mimeType: string; createdAt: string }
  interface DBSession { token: string; userId: string }

  const DB_FILE = path.resolve(__dirname, './db.json')
  const UPLOADS_DIR = path.resolve(__dirname, './uploads')

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }

  function loadDB() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8')
        const data = JSON.parse(raw)
        const teamMembers = new Map<string, DBMember[]>()
        if (data.teamMembers) {
          for (const [k, v] of Object.entries(data.teamMembers)) {
            teamMembers.set(k, v as DBMember[])
          }
        }
        return {
          teams: data.teams || [],
          teamMembers,
          boards: data.boards || [],
          boardFiles: data.boardFiles || [],
          elements: data.elements || [],
          resources: data.resources || [],
          sessions: data.sessions || [],
        }
      }
    } catch (e) {
      console.error('Failed to load db.json:', e)
    }
    return null
  }

  function saveDB() {
    try {
      const data = {
        teams: db.teams,
        teamMembers: Object.fromEntries(db.teamMembers),
        boards: db.boards,
        boardFiles: db.boardFiles,
        elements: db.elements,
        resources: db.resources,
        sessions: db.sessions,
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('Failed to save db.json:', e)
    }
  }

  function getUsers(): DBUser[] {
    const accounts = loadTestAccounts()
    return accounts.map((acc, idx) => ({
      id: 'user-' + String(idx + 1).padStart(3, '0'),
      email: acc.username,
      name: acc.roles.includes('admin') ? '管理员' : '演示用户',
      password: acc.password,
      roles: acc.roles,
    }))
  }

  const loaded = loadDB()
  const db = {
    get users() { return getUsers() },
    teams: loaded?.teams || [] as DBTeam[],
    teamMembers: loaded?.teamMembers || new Map<string, DBMember[]>(),
    boards: loaded?.boards || [] as DBBoard[],
    boardFiles: loaded?.boardFiles || [] as DBFile[],
    elements: loaded?.elements || [] as DBElement[],
    resources: loaded?.resources || [] as DBResource[],
    sessions: loaded?.sessions || [] as DBSession[],
  }

  function isUploadUrl(url: string): boolean {
    return url.startsWith('/uploads/')
  }

  function extractUploadId(url: string): string | null {
    const match = url.match(/^\/uploads\/(.+)$/)
    return match ? match[1] : null
  }

  function deleteUpload(url: string): void {
    const id = extractUploadId(url)
    if (id) {
      const filePath = path.join(UPLOADS_DIR, id)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
  }

  function deleteAllTeamData(teamId: string): void {
    const boardIds = db.boards.filter(b => b.teamId === teamId).map(b => b.id)
    for (const boardId of boardIds) {
      const resources = db.resources.filter(r => r.boardId === boardId)
      for (const res of resources) {
        if (isUploadUrl(res.url)) deleteUpload(res.url)
        if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
      }
      db.resources = db.resources.filter(r => r.boardId !== boardId)
      db.boardFiles = db.boardFiles.filter(f => f.boardId !== boardId)
      db.elements = db.elements.filter(e => e.boardId !== boardId)
    }
    db.boards = db.boards.filter(b => b.teamId !== teamId)
    db.teamMembers.delete(teamId)
    db.teams = db.teams.filter(t => t.id !== teamId)
    saveDB()
  }

  function auth(headers: Record<string, string>) {
    const cookie = (headers.cookie || '')
    const m = cookie.match(/auth_token=([^;]+)/)
    if (!m) return null
    const s = db.sessions.find(x => x.token === m[1])
    if (!s) return null
    return db.users.find(u => u.id === s.userId) || null
  }

  function j(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
    })
  }

  async function handle(path: string, method: string, headers: Record<string, string>, search: Record<string, string>, body: any): Promise<Response | null> {
    // ── Auth ──
    if (path === '/api/auth/login' && method === 'POST') {
      const accounts = loadTestAccounts()
      const acc = accounts.find(x => x.username === body.email && x.password === body.password)
      if (!acc) return j({ error: '邮箱或密码错误' }, 401)
      if (!acc.status) return j({ error: '账号未启用' }, 401)
      const idx = accounts.indexOf(acc)
      const user = {
        id: 'user-' + String(idx + 1).padStart(3, '0'),
        email: acc.username,
        name: acc.roles.includes('admin') ? '管理员' : '演示用户',
        roles: acc.roles,
      }
      const token = uid() + uid()
      db.sessions.push({ token, userId: user.id })
      const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`
      return j({ user, token }, 200, { 'Set-Cookie': cookieHeader })
    }
    if (path === '/api/auth/register' && method === 'POST') {
      if (db.users.find(x => x.email === body.email)) return j({ error: '邮箱已注册' }, 400)
      const u: DBUser = { id: 'user-' + uid(), email: body.email, name: body.name, password: body.password }
      db.users.push(u)
      const token = uid() + uid()
      db.sessions.push({ token, userId: u.id })
      const { password, ...safe } = u
      const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`
      return j({ user: safe, token }, 200, { 'Set-Cookie': cookieHeader })
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      const m = (headers.cookie || '').match(/auth_token=([^;]+)/)
      if (m) db.sessions = db.sessions.filter(s => s.token !== m[1])
      return j({}, 200, { 'Set-Cookie': 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' })
    }
    if (path === '/api/auth/me' && method === 'GET') {
      const s = auth(headers)
      if (!s) return j({ error: '未登录' }, 401)
      const accounts = loadTestAccounts()
      const idx = parseInt(s.id.replace('user-', '')) - 1
      const acc = accounts[idx]
      if (!acc || !acc.status) return j({ error: '账号未启用' }, 401)
      const user = {
        id: s.id,
        email: acc.username,
        name: acc.roles.includes('admin') ? '管理员' : '演示用户',
        roles: acc.roles,
      }
      return j({ user })
    }

    // ── External API (v1) ──
    if (path.startsWith('/api/v1/')) {
      const u = auth(headers)
      if (!u) return j({ error: '未授权，请先登录' }, 401)

      const subPath = path.replace('/api/v1/', '')

      if (subPath === 'me' && method === 'GET') {
        return j({ user: { id: u.id, email: u.email, name: u.name, roles: u.roles } })
      }
      if (subPath === 'teams' && method === 'GET') {
        const teams = db.teams.map(t => {
          const members = db.teamMembers.get(t.id) || []
          const member = members.find(m => m.userId === u.id)
          const role = member?.role || 'viewer'
          return { ...t, role, memberCount: members.length }
        })
        return j({ teams })
      }
      if (subPath === 'boards' && method === 'GET') {
        const teamId = search.teamId
        if (!teamId) return j({ error: '缺少 teamId 参数' }, 400)
        return j({ boards: db.boards.filter(b => b.teamId === teamId) })
      }
      if (subPath === 'files' && method === 'GET') {
        const boardId = search.boardId
        if (!boardId) return j({ error: '缺少 boardId 参数' }, 400)
        let files = db.boardFiles.filter(f => f.boardId === boardId)
        if (search.parentId) {
          files = files.filter(f => f.parentId === search.parentId)
        }
        files.sort((a, b) => a.sortOrder - b.sortOrder)
        return j({ files })
      }
      if (subPath === 'files' && method === 'POST') {
        const { boardId, parentId, name, type, content } = body
        if (!boardId || !name) return j({ error: '缺少必要参数' }, 400)
        const existing = db.boardFiles.filter(f => f.boardId === boardId)
        const f: DBFile = { id: 'file-' + uid(), boardId, parentId: parentId || null, name, type: type || 'note', content: content || '', sortOrder: existing.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        db.boardFiles.push(f)
        saveDB()
        return j({ file: f })
      }
      if (subPath === 'files' && method === 'PATCH') {
        const f = db.boardFiles.find(x => x.id === body.fileId)
        if (!f) return j({ error: '不存在' }, 404)
        if (body.content !== undefined) f.content = body.content
        if (body.name) f.name = body.name
        if (body.sortOrder !== undefined) f.sortOrder = body.sortOrder
        if (body.parentId !== undefined) f.parentId = body.parentId || null
        f.updatedAt = new Date().toISOString()
        saveDB()
        return j({ file: f })
      }
      if (subPath === 'files' && method === 'DELETE') {
        const fileId = search.fileId
        if (!fileId) return j({ error: '缺少 fileId 参数' }, 400)
        const idsToDelete: string[] = [fileId]
        const queue = [fileId]
        while (queue.length > 0) {
          const pid = queue.shift()!
          const children = db.boardFiles.filter(f => f.parentId === pid)
          for (const child of children) {
            idsToDelete.push(child.id)
            queue.push(child.id)
          }
        }
        for (const id of idsToDelete) {
          const resources = db.resources.filter(r => r.fileId === id)
          for (const res of resources) {
            if (isUploadUrl(res.url)) deleteUpload(res.url)
            if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
          }
          db.resources = db.resources.filter(r => r.fileId !== id)
          db.elements = db.elements.filter(e => e.fileId !== id)
        }
        db.boardFiles = db.boardFiles.filter(f => !idsToDelete.includes(f.id))
        saveDB()
        return j({})
      }
      if (subPath === 'elements' && method === 'GET') {
        const boardId = search.boardId
        if (!boardId) return j({ error: '缺少 boardId 参数' }, 400)
        return j({ elements: db.elements.filter(e => e.boardId === boardId) })
      }
      if (subPath === 'elements' && method === 'POST') {
        const { boardId, type, name, content, color, position, fileId } = body
        if (!boardId || !type || !name) return j({ error: '缺少必要参数' }, 400)
        const el: DBElement = { id: 'elem-' + uid(), boardId, fileId: fileId || null, type, name, content: content || '', color: color || '#6b7280', position: position || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        db.elements.push(el)
        saveDB()
        return j({ element: el })
      }
      if (subPath === 'elements' && method === 'PATCH') {
        const el = db.elements.find(e => e.id === body.elementId)
        if (!el) return j({ error: '不存在' }, 404)
        if (body.name !== undefined) el.name = body.name
        if (body.content !== undefined) el.content = body.content
        if (body.color !== undefined) el.color = body.color
        if (body.position !== undefined) el.position = body.position
        if (body.fileId !== undefined) el.fileId = body.fileId
        el.updatedAt = new Date().toISOString()
        saveDB()
        return j({ element: el })
      }
      if (subPath === 'elements' && method === 'DELETE') {
        const elementId = search.elementId
        if (!elementId) return j({ error: '缺少 elementId 参数' }, 400)
        db.elements = db.elements.filter(e => e.id !== elementId)
        saveDB()
        return j({})
      }
      if (subPath === 'resources' && method === 'GET') {
        const boardId = search.boardId
        if (!boardId) return j({ error: '缺少 boardId 参数' }, 400)
        return j({ resources: db.resources.filter(r => r.boardId === boardId) })
      }
      if (subPath === 'resources' && method === 'DELETE') {
        const resourceId = search.resourceId
        if (!resourceId) return j({ error: '缺少 resourceId 参数' }, 400)
        const res = db.resources.find(r => r.id === resourceId)
        if (res) {
          if (isUploadUrl(res.url)) deleteUpload(res.url)
          if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
        }
        db.resources = db.resources.filter(r => r.id !== resourceId)
        saveDB()
        return j({})
      }

      return j({ error: '未知的 API 端点', availableEndpoints: ['/me', '/teams', '/boards', '/files', '/elements', '/resources'] }, 404)
    }

    // ── Teams ──
    if (path === '/api/teams' && method === 'GET') {
      const u = auth(headers)
      if (!u) return j({ teams: [] })
      const teams = db.teams.map(t => {
        const members = db.teamMembers.get(t.id) || []
        const member = members.find(m => m.userId === u.id)
        const role = member?.role || 'viewer'
        return { ...t, role, memberCount: members.length }
      })
      return j({ teams })
    }
    if (path === '/api/teams' && method === 'POST') {
      const u = auth(headers)
      if (!u) return j({ error: '未登录' }, 401)
      const t: DBTeam = { id: 'team-' + uid(), name: body.name, icon: body.icon || '🎬', inviteCode: uid().substring(0, 8).toUpperCase(), ownerId: u.id }
      db.teams.push(t)
      db.teamMembers.set(t.id, [{ userId: u.id, name: u.name, email: u.email, role: 'owner', joinedAt: new Date().toISOString() }])
      saveDB()
      return j({ team: { ...t, role: 'owner', memberCount: 1 } })
    }
    if (path === '/api/teams' && method === 'PATCH') {
      const t = db.teams.find(x => x.id === body.teamId)
      if (!t) return j({ error: '团队不存在' }, 404)
      if (body.name) t.name = body.name
      if (body.icon) {
        if (t.icon && t.icon !== body.icon && isUploadUrl(t.icon)) deleteUpload(t.icon)
        t.icon = body.icon
      }
      saveDB()
      return j({ team: t })
    }
    if (path === '/api/teams' && method === 'DELETE') {
      const tid = search.teamId
      const t = db.teams.find(x => x.id === tid)
      if (!t) return j({ error: '团队不存在' }, 404)
      if (t.icon && isUploadUrl(t.icon)) deleteUpload(t.icon)
      deleteAllTeamData(tid)
      return j({})
    }

    // ── Team Lookup (by invite code) ──
    if (path === '/api/teams/lookup' && method === 'GET') {
      const code = search.code
      if (!code) return j({ error: '缺少邀请码' }, 400)
      const team = db.teams.find(t => t.inviteCode === code.trim().toUpperCase())
      if (!team) return j({ error: '邀请码无效或团队不存在' }, 404)
      const owner = db.users.find(u => u.id === team.ownerId)
      const members = db.teamMembers.get(team.id) || []
      const memberCount = members.length
      const u = auth(headers)
      const isMember = u ? !!members.find(m => m.userId === u.id) : false
      return j({
        id: team.id,
        name: team.name,
        icon: team.icon,
        memberCount,
        ownerName: owner?.name || '未知',
        isMember,
        createdAt: team.id.replace('team-', ''),
      })
    }

    // ── Team Members ──
    if (path === '/api/teams/join' && method === 'GET') {
      return j({ members: db.teamMembers.get(search.teamId) || [] })
    }
    if (path === '/api/teams/join' && method === 'POST') {
      const u = auth(headers)
      if (!u) return j({ error: '未登录' }, 401)
      let tid = body.teamId || search.teamId
      if (!tid && body.inviteCode) {
        const team = db.teams.find(t => t.inviteCode === body.inviteCode)
        if (!team) return j({ error: '邀请码无效' }, 404)
        tid = team.id
      }
      if (!tid) return j({ error: '缺少参数' }, 400)
      const members = db.teamMembers.get(tid) || []
      if (members.find(m => m.userId === u.id)) return j({ error: '已是团队成员' }, 400)
      members.push({ userId: u.id, name: u.name, email: u.email, role: 'editor', joinedAt: new Date().toISOString() })
      db.teamMembers.set(tid, members)
      saveDB()
      const team = db.teams.find(t => t.id === tid)
      return j({ team })
    }
    if (path === '/api/teams/join' && method === 'PATCH') {
      const members = db.teamMembers.get(body.teamId)
      if (members) {
        const m = members.find(x => x.userId === body.userId)
        if (m) m.role = body.role
      }
      saveDB()
      return j({})
    }
    if (path === '/api/teams/join' && method === 'DELETE') {
      const members = db.teamMembers.get(search.teamId)
      if (members) {
        const idx = members.findIndex(m => m.userId === search.userId)
        if (idx >= 0) members.splice(idx, 1)
      }
      saveDB()
      return j({})
    }

    // ── Boards ──
    // Get single board by ID
    if (path.startsWith('/api/boards/') && method === 'GET') {
      const boardId = path.split('/').pop() || ''
      const board = db.boards.find(b => b.id === boardId)
      if (!board) return j({ error: '导演板不存在' }, 404)
      return j({ board })
    }
    if (path === '/api/boards' && method === 'GET') {
      return j({ boards: db.boards.filter(b => b.teamId === search.teamId) })
    }
    if (path === '/api/boards' && method === 'POST') {
      const u = auth(headers)
      const b: DBBoard = { id: 'board-' + uid(), name: body.name, teamId: body.teamId, createdBy: u?.id || 'unknown', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      db.boards.push(b)
      saveDB()
      return j({ board: b })
    }
    if (path === '/api/boards' && method === 'PATCH') {
      const b = db.boards.find(x => x.id === body.boardId)
      if (!b) return j({ error: '不存在' }, 404)
      if (body.name) b.name = body.name
      b.updatedAt = new Date().toISOString()
      saveDB()
      return j({ board: b })
    }
    if (path === '/api/boards' && method === 'DELETE') {
      const boardId = search.boardId
      // 删除相关资源文件
      const resources = db.resources.filter(r => r.boardId === boardId)
      for (const res of resources) {
        if (isUploadUrl(res.url)) deleteUpload(res.url)
        if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
      }
      db.boards = db.boards.filter(b => b.id !== boardId)
      db.boardFiles = db.boardFiles.filter(f => f.boardId !== boardId)
      db.elements = db.elements.filter(e => e.boardId !== boardId)
      db.resources = db.resources.filter(r => r.boardId !== boardId)
      saveDB()
      return j({})
    }

    // ── Board Files ──
    if (path === '/api/boards/files' && method === 'GET') {
      if (search.fileId) {
        const f = db.boardFiles.find(x => x.id === search.fileId)
        if (!f) return j({ error: '不存在' }, 404)
        return j({ file: f })
      }
      if (!search.boardId) return j({ error: '缺少 boardId' }, 400)
      let files = db.boardFiles.filter(f => f.boardId === search.boardId)
      if (search.parentId) {
        files = files.filter(f => f.parentId === search.parentId)
      } else {
        files = files.filter(f => !f.parentId)
      }
      files.sort((a, b) => a.sortOrder - b.sortOrder)
      return j({ files })
    }
    if (path === '/api/boards/files' && method === 'POST') {
      const existing = db.boardFiles.filter(f => f.boardId === body.boardId)
      const f: DBFile = { id: 'file-' + uid(), boardId: body.boardId, parentId: body.parentId || null, name: body.name, type: body.type || 'note', content: body.content || '', sortOrder: existing.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      db.boardFiles.push(f)
      saveDB()
      return j({ file: f })
    }
    if (path === '/api/boards/files' && method === 'PATCH') {
      const f = db.boardFiles.find(x => x.id === body.fileId)
      if (!f) return j({ error: '不存在' }, 404)
      if (body.content !== undefined) f.content = body.content
      if (body.name) f.name = body.name
      if (body.sortOrder !== undefined) f.sortOrder = body.sortOrder
      if (body.parentId !== undefined) f.parentId = body.parentId || null
      f.updatedAt = new Date().toISOString()
      saveDB()
      return j({ file: f })
    }
    if (path === '/api/boards/files' && method === 'DELETE') {
      const fileId = search.fileId
      const idsToDelete: string[] = [fileId]
      const queue = [fileId]
      while (queue.length > 0) {
        const pid = queue.shift()!
        const children = db.boardFiles.filter(f => f.parentId === pid)
        for (const child of children) {
          idsToDelete.push(child.id)
          queue.push(child.id)
        }
      }
      for (const id of idsToDelete) {
        const resources = db.resources.filter(r => r.fileId === id)
        for (const res of resources) {
          if (isUploadUrl(res.url)) deleteUpload(res.url)
          if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
        }
        db.resources = db.resources.filter(r => r.fileId !== id)
        db.elements = db.elements.filter(e => e.fileId !== id)
      }
      db.boardFiles = db.boardFiles.filter(f => !idsToDelete.includes(f.id))
      saveDB()
      return j({})
    }

    // ── Elements ──
    if (path === '/api/boards/elements' && method === 'GET') {
      return j({ elements: db.elements.filter(e => e.boardId === search.boardId) })
    }
    if (path === '/api/boards/elements' && method === 'POST') {
      const el: DBElement = { id: 'elem-' + uid(), boardId: body.boardId, fileId: body.fileId || null, type: body.type, name: body.name, content: body.content || '', color: body.color || '#6b7280', position: body.position || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      db.elements.push(el)
      saveDB()
      return j({ element: el })
    }
    if (path === '/api/boards/elements' && method === 'PATCH') {
      const el = db.elements.find(e => e.id === body.elementId)
      if (!el) return j({ error: '不存在' }, 404)
      if (body.name !== undefined) el.name = body.name
      if (body.content !== undefined) el.content = body.content
      if (body.color !== undefined) el.color = body.color
      if (body.position !== undefined) el.position = body.position
      if (body.fileId !== undefined) el.fileId = body.fileId
      el.updatedAt = new Date().toISOString()
      saveDB()
      return j({ element: el })
    }
    if (path === '/api/boards/elements' && method === 'DELETE') {
      db.elements = db.elements.filter(e => e.id !== search.elementId)
      saveDB()
      return j({})
    }

    // ── Resources ──
    if (path === '/api/boards/resources' && method === 'GET') {
      return j({ resources: db.resources.filter(r => r.boardId === search.boardId) })
    }
    if (path === '/api/boards/resources' && method === 'POST') {
      const r: DBResource = { id: 'res-' + uid(), boardId: body.boardId, fileId: body.fileId || null, name: body.name, type: body.type, url: body.url, originalUrl: body.originalUrl || null, size: body.size || 0, mimeType: body.mimeType || 'image/png', createdAt: new Date().toISOString() }
      db.resources.push(r)
      saveDB()
      return j({ resource: r })
    }
    if (path === '/api/boards/resources' && method === 'DELETE') {
      const res = db.resources.find(r => r.id === search.resourceId)
      if (res) {
        if (isUploadUrl(res.url)) deleteUpload(res.url)
        if (res.originalUrl && isUploadUrl(res.originalUrl)) deleteUpload(res.originalUrl)
      }
      db.resources = db.resources.filter(r => r.id !== search.resourceId)
      saveDB()
      return j({})
    }

    // ── Setup Wizard ──
    if (path === '/api/setup/status' && method === 'GET') {
      return j({ installed: false })
    }
    if (path === '/api/setup/config' && method === 'GET') {
      return j({})
    }
    if (path.startsWith('/api/setup/') && method === 'POST') {
      return j({ success: true })
    }

    return null
  }

  const MIME_MAP: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  }

  return {
    name: 'mock-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url
        const uploadsMatch = url?.match(/^\/uploads\/(.+)$/)
        if (uploadsMatch) {
          const fileName = uploadsMatch[1]
          const filePath = path.join(UPLOADS_DIR, fileName)
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath)
            const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
            const mimeType = MIME_MAP[ext] || 'application/octet-stream'
            res.statusCode = 200
            res.setHeader('Content-Type', mimeType)
            res.setHeader('Content-Length', buf.length)
            res.setHeader('Cache-Control', 'no-cache')
            res.end(buf)
            return
          }
          res.statusCode = 404
          res.end('Not found')
          return
        }
        next()
      })

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url
        if (!url?.startsWith('/api/')) { next(); return }

        const urlObj = new URL(url, 'http://localhost')
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === 'string') headers[k] = v
          else if (Array.isArray(v)) headers[k] = v.join(', ')
        }

        if (urlObj.pathname === '/api/upload' && req.method === 'POST') {
          const contentType = headers['content-type'] || ''
          if (contentType.startsWith('multipart/form-data')) {
            const boundary = contentType.split('boundary=')[1]
            if (!boundary) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: '缺少 boundary' }))
              return
            }

            const chunks: Buffer[] = []
            await new Promise<void>((resolve) => {
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', () => resolve())
            })
            const raw = Buffer.concat(chunks)

            const boundaryBuf = Buffer.from('--' + boundary)
            const parts: Buffer[] = []
            let start = 0
            while (start < raw.length) {
              const idx = raw.indexOf(boundaryBuf, start)
              if (idx === -1) break
              if (start > 0) parts.push(raw.slice(start, idx))
              start = idx + boundaryBuf.length
              if (raw[start] === 0x0d) start += 2
              else if (raw[start] === 0x0a) start += 1
            }

            let fileData: Buffer | null = null
            let fileName = 'upload.png'
            let fileMime = 'image/png'

            for (const part of parts) {
              const headerEnd = part.indexOf('\r\n\r\n')
              if (headerEnd === -1) continue
              const headerStr = part.slice(0, headerEnd).toString('utf-8')
              const bodyBuf = part.slice(headerEnd + 4, part.length - 2)
              const nameMatch = headerStr.match(/name="([^"]+)"/)
              if (!nameMatch) continue
              const fieldName = nameMatch[1]
              if (fieldName === 'file') {
                fileData = bodyBuf
                const fnMatch = headerStr.match(/filename="([^"]+)"/)
                if (fnMatch) fileName = fnMatch[1]
                const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i)
                if (ctMatch) fileMime = ctMatch[1].trim()
              }
            }

            if (!fileData) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: '未找到上传文件' }))
              return
            }

            const fileId = uid()
            const ext = fileMime.split('/')[1]?.split('+')[0] || 'png'
            const filePath = path.join(UPLOADS_DIR, fileId + '.' + ext)
            fs.writeFileSync(filePath, fileData!)
            const fileUrl = '/uploads/' + fileId + '.' + ext
            const resp = j({ 
              url: fileUrl, 
              originalUrl: fileUrl, 
              size: fileData.length, 
              name: fileName,
              mimeType: fileMime,
              format: ext,
              originalName: fileName
            })
            res.statusCode = resp.status
            res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/json; charset=utf-8')
            res.end(await resp.text())
            return
          }
        }

        const getBody = (): Promise<any> => new Promise((resolve) => {
          if (req.body) { resolve(req.body); return }
          const chunks: Buffer[] = []
          req.on('data', (chunk: Buffer) => chunks.push(chunk))
          req.on('end', () => {
            const raw = Buffer.concat(chunks).toString()
            try { resolve(JSON.parse(raw)) } catch { resolve({}) }
          })
        })

        const body = await getBody()
        const resp = await handle(urlObj.pathname, req.method || 'GET', headers, Object.fromEntries(urlObj.searchParams), body)
        if (resp) {
          const respHeaders: Record<string, string> = {}
          resp.headers.forEach((v, k) => respHeaders[k] = v)
          res.statusCode = resp.status
          res.setHeader('Content-Type', respHeaders['content-type'] || 'application/json; charset=utf-8')
          if (respHeaders['set-cookie']) {
            res.setHeader('Set-Cookie', respHeaders['set-cookie'])
          }
          res.end(await resp.text())
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    ...(process.env.NODE_ENV === 'development' ? [mockAPIPlugin()] : []),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
