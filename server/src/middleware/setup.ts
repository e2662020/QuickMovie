import { Request, Response, NextFunction } from 'express'
import { getDb } from '../db.js'

const SETUP_EXEMPT_PREFIXES = ['/api/setup', '/uploads', '/api/auth/login', '/api/auth/register']

export function setupMiddleware(req: Request, res: Response, next: NextFunction) {
  for (const prefix of SETUP_EXEMPT_PREFIXES) {
    if (req.path.startsWith(prefix)) {
      return next()
    }
  }

  const db = getDb()
  const installed = db.prepare("SELECT value FROM settings WHERE key = 'installed'").get() as { value: string } | undefined

  if (!installed || installed.value !== 'true') {
    if (req.path.startsWith('/api')) {
      return res.status(503).json({ error: 'Server not initialized', redirect: '/setup' })
    }
    return res.redirect('/setup')
  }

  if (req.path === '/setup') {
    return res.redirect('/')
  }

  next()
}
