import { Request, Response, NextFunction } from 'express'
import { getDb } from '../db.js'
import { loadTestAccounts } from '../utils/accounts.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const cookie = req.headers.cookie || ''
  const m = cookie.match(/auth_token=([^;]+)/)
  if (!m) {
    next()
    return
  }

  const token = m[1]
  const db = getDb()
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) as { user_id: string } | undefined
  if (!session) {
    next()
    return
  }

  const dbUser = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(session.user_id) as any
  if (dbUser) {
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      roles: [dbUser.role || 'user'],
    }
    next()
    return
  }

  const accounts = loadTestAccounts()
  const idx = parseInt(session.user_id.replace('user-', '')) - 1
  const acc = accounts[idx]
  if (acc) {
    req.user = {
      id: session.user_id,
      email: acc.username,
      name: acc.roles.includes('admin') ? '管理员' : '演示用户',
      roles: acc.roles,
    }
  }

  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: '未授权，请先登录' })
    return
  }
  next()
}
