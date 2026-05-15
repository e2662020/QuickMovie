import { Router, Request, Response } from 'express'
import { getDb, uid } from '../db.js'
import { loadTestAccounts } from '../utils/accounts.js'

const router = Router()

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body
  const accounts = loadTestAccounts()
  const acc = accounts.find(x => x.username === email && x.password === password)

  if (!acc) {
    const db = getDb()
    const dbUser = db.prepare('SELECT id, email, name, role, password_hash FROM users WHERE email = ?').get(email) as any
    if (!dbUser || dbUser.password_hash !== password) {
      res.status(401).json({ error: '邮箱或密码错误' })
      return
    }
    if (!dbUser.active) {
      res.status(401).json({ error: '账号未启用' })
      return
    }
    const token = uid() + uid()
    db.prepare('INSERT INTO sessions (id, token, user_id) VALUES (?, ?, ?)').run(uid(), token, dbUser.id)
    const user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, roles: [dbUser.role || 'user'] }
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`)
    res.json({ user, token })
    return
  }

  if (!acc.status) {
    res.status(401).json({ error: '账号未启用' })
    return
  }

  const idx = accounts.indexOf(acc)
  const userId = 'user-' + String(idx + 1).padStart(3, '0')
  const user = {
    id: userId,
    email: acc.username,
    name: acc.roles.includes('admin') ? '管理员' : '演示用户',
    roles: acc.roles,
  }

  const token = uid() + uid()
  const db = getDb()
  db.prepare('INSERT INTO sessions (id, token, user_id) VALUES (?, ?, ?)').run(uid(), token, userId)
  res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`)
  res.json({ user, token })
})

router.get('/auth/me', (req: Request, res: Response) => {
  const cookie = req.headers.cookie || ''
  const m = cookie.match(/auth_token=([^;]+)/)
  if (!m) {
    res.status(401).json({ error: '未登录' })
    return
  }

  const db = getDb()
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(m[1]) as { user_id: string } | undefined
  if (!session) {
    res.status(401).json({ error: '未登录' })
    return
  }

  const dbUser = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(session.user_id) as any
  if (dbUser) {
    const user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, roles: [dbUser.role || 'user'] }
    res.json({ user })
    return
  }

  const accounts = loadTestAccounts()
  const idx = parseInt(session.user_id.replace('user-', '')) - 1
  const acc = accounts[idx]
  if (!acc || !acc.status) {
    res.status(401).json({ error: '账号未启用' })
    return
  }

  const user = {
    id: session.user_id,
    email: acc.username,
    name: acc.roles.includes('admin') ? '管理员' : '演示用户',
    roles: acc.roles,
  }
  res.json({ user })
})

router.post('/auth/register', (req: Request, res: Response) => {
  const { email, name, password } = req.body
  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    res.status(400).json({ error: '邮箱已注册' })
    return
  }

  const userId = 'user-' + uid()
  db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(userId, email, name, password, 'user')

  const token = uid() + uid()
  db.prepare('INSERT INTO sessions (id, token, user_id) VALUES (?, ?, ?)').run(uid(), token, userId)

  const user = { id: userId, email, name, roles: ['user'] }
  res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax`)
  res.json({ user, token })
})

router.post('/auth/logout', (_req: Request, res: Response) => {
  const cookie = _req.headers.cookie || ''
  const m = cookie.match(/auth_token=([^;]+)/)
  if (m) {
    const db = getDb()
    db.prepare('DELETE FROM sessions WHERE token = ?').run(m[1])
  }
  res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  res.json({})
})

export default router
