import { Router, Request, Response } from 'express'
import { getDb, uid } from '../db.js'
import path from 'path'
import fs from 'fs'

const router = Router()

function deleteUpload(url: string | null): void {
  if (!url || !url.startsWith('/uploads/')) return
  const id = url.replace('/uploads/', '')
  const filePath = path.resolve(path.join(process.cwd(), '..', 'uploads', id))
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

function deleteAllTeamData(teamId: string): void {
  const db = getDb()
  const boardRows = db.prepare('SELECT id FROM boards WHERE team_id = ?').all(teamId) as { id: string }[]
  for (const b of boardRows) {
    const resources = db.prepare('SELECT url, original_url FROM resources WHERE board_id = ?').all(b.id) as { url: string; original_url: string | null }[]
    for (const r of resources) {
      deleteUpload(r.url)
      if (r.original_url) deleteUpload(r.original_url)
    }
    db.prepare('DELETE FROM resources WHERE board_id = ?').run(b.id)
    db.prepare('DELETE FROM board_files WHERE board_id = ?').run(b.id)
    db.prepare('DELETE FROM story_elements WHERE board_id = ?').run(b.id)
  }
  db.prepare('DELETE FROM boards WHERE team_id = ?').run(teamId)
  db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId)
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId)
}

router.get('/teams', (req: Request, res: Response) => {
  const db = getDb()
  const teams = db.prepare('SELECT * FROM teams').all() as any[]
  const user = req.user as any

  const result = teams.map(t => {
    const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(t.id) as any[]
    const member = user ? members.find((m: any) => m.user_id === user.id) : undefined
    const role = member?.role || 'viewer'
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      inviteCode: t.invite_code,
      ownerId: t.owner_id,
      role,
      memberCount: members.length,
      createdAt: t.created_at,
    }
  })
  res.json({ teams: result })
})

router.post('/teams', (req: Request, res: Response) => {
  const user = req.user as any
  if (!user) {
    res.status(401).json({ error: '未登录' })
    return
  }

  const db = getDb()
  const id = 'team-' + uid()
  const inviteCode = uid().substring(0, 8).toUpperCase()
  const now = new Date().toISOString()

  db.prepare('INSERT INTO teams (id, name, icon, invite_code, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.body.name, req.body.icon || '🎬', inviteCode, user.id, now
  )
  db.prepare('INSERT INTO team_members (team_id, user_id, name, email, role, joined_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, user.id, user.name, user.email, 'owner', now
  )

  res.json({
    team: {
      id,
      name: req.body.name,
      icon: req.body.icon || '🎬',
      inviteCode,
      ownerId: user.id,
      role: 'owner',
      memberCount: 1,
      createdAt: now,
    }
  })
})

router.get('/teams/:id', (req: Request, res: Response) => {
  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any
  if (!team) {
    res.status(404).json({ error: '团队不存在' })
    return
  }
  const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(team.id) as any[]
  res.json({
    team: {
      id: team.id,
      name: team.name,
      icon: team.icon,
      inviteCode: team.invite_code,
      ownerId: team.owner_id,
      memberCount: members.length,
      members: members.map((m: any) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role, joinedAt: m.joined_at })),
      createdAt: team.created_at,
    }
  })
})

router.put('/teams/:id', (req: Request, res: Response) => {
  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any
  if (!team) {
    res.status(404).json({ error: '团队不存在' })
    return
  }
  if (req.body.name) {
    db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(req.body.name, team.id)
    team.name = req.body.name
  }
  if (req.body.icon) {
    if (team.icon && team.icon !== req.body.icon) deleteUpload(team.icon)
    db.prepare('UPDATE teams SET icon = ? WHERE id = ?').run(req.body.icon, team.id)
    team.icon = req.body.icon
  }
  res.json({ team: { id: team.id, name: team.name, icon: team.icon, inviteCode: team.invite_code, ownerId: team.owner_id, createdAt: team.created_at } })
})

router.delete('/teams/:id', (req: Request, res: Response) => {
  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any
  if (!team) {
    res.status(404).json({ error: '团队不存在' })
    return
  }
  if (team.icon) deleteUpload(team.icon)
  deleteAllTeamData(req.params.id)
  res.json({})
})

router.patch('/teams', (req: Request, res: Response) => {
  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.body.teamId) as any
  if (!team) {
    res.status(404).json({ error: '团队不存在' })
    return
  }
  if (req.body.name) {
    db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(req.body.name, team.id)
    team.name = req.body.name
  }
  if (req.body.icon) {
    if (team.icon && team.icon !== req.body.icon) deleteUpload(team.icon)
    db.prepare('UPDATE teams SET icon = ? WHERE id = ?').run(req.body.icon, team.id)
    team.icon = req.body.icon
  }
  res.json({ team: { id: team.id, name: team.name, icon: team.icon, inviteCode: team.invite_code, ownerId: team.owner_id, createdAt: team.created_at } })
})

router.delete('/teams', (req: Request, res: Response) => {
  const tid = req.query.teamId as string
  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(tid) as any
  if (!team) {
    res.status(404).json({ error: '团队不存在' })
    return
  }
  if (team.icon) deleteUpload(team.icon)
  deleteAllTeamData(tid)
  res.json({})
})

router.get('/teams/lookup', (req: Request, res: Response) => {
  const code = req.query.code as string
  if (!code) {
    res.status(400).json({ error: '缺少邀请码' })
    return
  }

  const db = getDb()
  const team = db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(code.trim().toUpperCase()) as any
  if (!team) {
    res.status(404).json({ error: '邀请码无效或团队不存在' })
    return
  }

  const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(team.owner_id) as any
  const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(team.id) as any[]
  const user = req.user as any
  const isMember = user ? members.some((m: any) => m.user_id === user.id) : false

  res.json({
    id: team.id,
    name: team.name,
    icon: team.icon,
    memberCount: members.length,
    ownerName: owner?.name || '未知',
    isMember,
    createdAt: team.created_at,
  })
})

router.get('/teams/join', (req: Request, res: Response) => {
  const db = getDb()
  const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(req.query.teamId as string) as any[]
  res.json({ members: members.map((m: any) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role, joinedAt: m.joined_at })) })
})

router.post('/teams/join', (req: Request, res: Response) => {
  const user = req.user as any
  if (!user) {
    res.status(401).json({ error: '未登录' })
    return
  }

  const db = getDb()
  let tid = req.body.teamId || req.query.teamId

  if (!tid && req.body.inviteCode) {
    const team = db.prepare('SELECT id FROM teams WHERE invite_code = ?').get(req.body.inviteCode) as any
    if (!team) {
      res.status(404).json({ error: '邀请码无效' })
      return
    }
    tid = team.id
  }

  if (!tid) {
    res.status(400).json({ error: '缺少参数' })
    return
  }

  const existingMember = db.prepare('SELECT user_id FROM team_members WHERE team_id = ? AND user_id = ?').get(tid, user.id)
  if (existingMember) {
    res.status(400).json({ error: '已是团队成员' })
    return
  }

  db.prepare('INSERT INTO team_members (team_id, user_id, name, email, role, joined_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    tid, user.id, user.name, user.email, 'editor', new Date().toISOString()
  )

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(tid) as any
  res.json({ team: { id: team.id, name: team.name, icon: team.icon, inviteCode: team.invite_code, ownerId: team.owner_id, createdAt: team.created_at } })
})

router.patch('/teams/join', (req: Request, res: Response) => {
  const db = getDb()
  const { teamId, userId, role } = req.body
  if (teamId && userId) {
    db.prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?').run(role || 'editor', teamId, userId)
  }
  res.json({})
})

router.delete('/teams/join', (req: Request, res: Response) => {
  const db = getDb()
  const { teamId, userId } = req.query
  if (teamId && userId) {
    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId as string, userId as string)
  }
  res.json({})
})

export default router
