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

function deleteFileChildren(fileId: string): void {
  const db = getDb()
  const idsToDelete: string[] = [fileId]
  const queue = [fileId]
  while (queue.length > 0) {
    const pid = queue.shift()!
    const children = db.prepare('SELECT id FROM board_files WHERE parent_id = ?').all(pid) as { id: string }[]
    for (const child of children) {
      idsToDelete.push(child.id)
      queue.push(child.id)
    }
  }
  for (const id of idsToDelete) {
    const resources = db.prepare('SELECT url, original_url FROM resources WHERE file_id = ?').all(id) as { url: string; original_url: string | null }[]
    for (const r of resources) {
      deleteUpload(r.url)
      if (r.original_url) deleteUpload(r.original_url)
    }
    db.prepare('DELETE FROM resources WHERE file_id = ?').run(id)
    db.prepare('DELETE FROM story_elements WHERE file_id = ?').run(id)
  }
  for (const id of idsToDelete) {
    db.prepare('DELETE FROM board_files WHERE id = ?').run(id)
  }
}

function boardToResponse(b: any) {
  return {
    id: b.id,
    name: b.name,
    teamId: b.team_id,
    createdBy: b.created_by,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }
}

function fileToResponse(f: any) {
  return {
    id: f.id,
    boardId: f.board_id,
    parentId: f.parent_id,
    name: f.name,
    type: f.type,
    content: f.content,
    sortOrder: f.sort_order,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }
}

function elementToResponse(e: any) {
  return {
    id: e.id,
    boardId: e.board_id,
    fileId: e.file_id,
    type: e.type,
    name: e.name,
    content: e.content,
    color: e.color,
    position: e.position,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function resourceToResponse(r: any) {
  return {
    id: r.id,
    boardId: r.board_id,
    fileId: r.file_id,
    name: r.name,
    type: r.type,
    url: r.url,
    originalUrl: r.original_url,
    size: r.size,
    mimeType: r.mime_type,
    createdAt: r.created_at,
  }
}

// ═══ Boards ═══

router.get('/boards', (req: Request, res: Response) => {
  const db = getDb()
  const boards = db.prepare('SELECT * FROM boards WHERE team_id = ?').all(req.query.teamId as string) as any[]
  res.json({ boards: boards.map(boardToResponse) })
})

router.post('/boards', (req: Request, res: Response) => {
  const user = req.user
  const db = getDb()
  const id = 'board-' + uid()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO boards (id, name, team_id, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.body.name, req.body.teamId, user?.id || 'unknown', now, now
  )
  res.json({ board: { id, name: req.body.name, teamId: req.body.teamId, createdBy: user?.id || 'unknown', createdAt: now, updatedAt: now } })
})

router.get('/boards/:id', (req: Request, res: Response) => {
  const db = getDb()
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id) as any
  if (!board) {
    res.status(404).json({ error: '导演板不存在' })
    return
  }
  res.json({ board: boardToResponse(board) })
})

router.put('/boards/:id', (req: Request, res: Response) => {
  const db = getDb()
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id) as any
  if (!board) {
    res.status(404).json({ error: '导演板不存在' })
    return
  }
  if (req.body.name) {
    db.prepare('UPDATE boards SET name = ?, updated_at = ? WHERE id = ?').run(req.body.name, new Date().toISOString(), board.id)
    board.name = req.body.name
  }
  board.updated_at = new Date().toISOString()
  res.json({ board: boardToResponse(board) })
})

router.delete('/boards/:id', (req: Request, res: Response) => {
  const db = getDb()
  const boardId = req.params.id
  const resources = db.prepare('SELECT url, original_url FROM resources WHERE board_id = ?').all(boardId) as { url: string; original_url: string | null }[]
  for (const r of resources) {
    deleteUpload(r.url)
    if (r.original_url) deleteUpload(r.original_url)
  }
  db.prepare('DELETE FROM resources WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM board_files WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM story_elements WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId)
  res.json({})
})

router.patch('/boards', (req: Request, res: Response) => {
  const db = getDb()
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.body.boardId) as any
  if (!board) {
    res.status(404).json({ error: '不存在' })
    return
  }
  if (req.body.name) {
    board.name = req.body.name
    db.prepare('UPDATE boards SET name = ?, updated_at = ? WHERE id = ?').run(req.body.name, new Date().toISOString(), board.id)
  }
  board.updated_at = new Date().toISOString()
  res.json({ board: boardToResponse(board) })
})

router.delete('/boards', (req: Request, res: Response) => {
  const db = getDb()
  const boardId = req.query.boardId as string
  const resources = db.prepare('SELECT url, original_url FROM resources WHERE board_id = ?').all(boardId) as { url: string; original_url: string | null }[]
  for (const r of resources) {
    deleteUpload(r.url)
    if (r.original_url) deleteUpload(r.original_url)
  }
  db.prepare('DELETE FROM resources WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM board_files WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM story_elements WHERE board_id = ?').run(boardId)
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId)
  res.json({})
})

// ═══ Board Files (flat) ═══

router.get('/boards/files', (req: Request, res: Response) => {
  const db = getDb()
  if (req.query.fileId) {
    const f = db.prepare('SELECT * FROM board_files WHERE id = ?').get(req.query.fileId as string) as any
    if (!f) { res.status(404).json({ error: '不存在' }); return }
    res.json({ file: fileToResponse(f) })
    return
  }
  if (!req.query.boardId) { res.status(400).json({ error: '缺少 boardId' }); return }

  let rows: any[]
  if (req.query.parentId) {
    rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? AND parent_id = ? ORDER BY sort_order').all(req.query.boardId as string, req.query.parentId as string)
  } else {
    rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? AND parent_id IS NULL ORDER BY sort_order').all(req.query.boardId as string)
  }
  res.json({ files: rows.map(fileToResponse) })
})

router.post('/boards/files', (req: Request, res: Response) => {
  const db = getDb()
  const now = new Date().toISOString()
  const id = 'file-' + uid()
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM board_files WHERE board_id = ?').get(req.body.boardId) as { cnt: number }
  db.prepare('INSERT INTO board_files (id, board_id, parent_id, name, type, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.body.boardId, req.body.parentId || null, req.body.name, req.body.type || 'note', req.body.content || '', existing.cnt, now, now
  )
  res.json({ file: { id, boardId: req.body.boardId, parentId: req.body.parentId || null, name: req.body.name, type: req.body.type || 'note', content: req.body.content || '', sortOrder: existing.cnt, createdAt: now, updatedAt: now } })
})

router.patch('/boards/files', (req: Request, res: Response) => {
  const db = getDb()
  const f = db.prepare('SELECT * FROM board_files WHERE id = ?').get(req.body.fileId) as any
  if (!f) { res.status(404).json({ error: '不存在' }); return }

  const updates: string[] = []
  const params: any[] = []

  if (req.body.content !== undefined) { updates.push('content = ?'); params.push(req.body.content); f.content = req.body.content }
  if (req.body.name) { updates.push('name = ?'); params.push(req.body.name); f.name = req.body.name }
  if (req.body.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(req.body.sortOrder); f.sort_order = req.body.sortOrder }
  if (req.body.parentId !== undefined) { updates.push('parent_id = ?'); params.push(req.body.parentId || null); f.parent_id = req.body.parentId || null }

  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(f.id)
  db.prepare(`UPDATE board_files SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  f.updated_at = new Date().toISOString()

  res.json({ file: fileToResponse(f) })
})

router.delete('/boards/files', (req: Request, res: Response) => {
  const fileId = req.query.fileId as string
  deleteFileChildren(fileId)
  res.json({})
})

// ═══ Board Elements (flat) ═══

router.get('/boards/elements', (req: Request, res: Response) => {
  const db = getDb()
  const elements = db.prepare('SELECT * FROM story_elements WHERE board_id = ?').all(req.query.boardId as string) as any[]
  res.json({ elements: elements.map(elementToResponse) })
})

router.post('/boards/elements', (req: Request, res: Response) => {
  const db = getDb()
  const id = 'elem-' + uid()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO story_elements (id, board_id, file_id, type, name, content, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.body.boardId, req.body.fileId || null, req.body.type, req.body.name, req.body.content || '', req.body.color || '#6b7280', req.body.position || null, now, now
  )
  res.json({ element: { id, boardId: req.body.boardId, fileId: req.body.fileId || null, type: req.body.type, name: req.body.name, content: req.body.content || '', color: req.body.color || '#6b7280', position: req.body.position || null, createdAt: now, updatedAt: now } })
})

router.patch('/boards/elements', (req: Request, res: Response) => {
  const db = getDb()
  const el = db.prepare('SELECT * FROM story_elements WHERE id = ?').get(req.body.elementId) as any
  if (!el) { res.status(404).json({ error: '不存在' }); return }

  const updates: string[] = []
  const params: any[] = []

  if (req.body.name !== undefined) { updates.push('name = ?'); params.push(req.body.name); el.name = req.body.name }
  if (req.body.content !== undefined) { updates.push('content = ?'); params.push(req.body.content); el.content = req.body.content }
  if (req.body.color !== undefined) { updates.push('color = ?'); params.push(req.body.color); el.color = req.body.color }
  if (req.body.position !== undefined) { updates.push('position = ?'); params.push(req.body.position); el.position = req.body.position }
  if (req.body.fileId !== undefined) { updates.push('file_id = ?'); params.push(req.body.fileId); el.file_id = req.body.fileId }

  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(el.id)
  db.prepare(`UPDATE story_elements SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  el.updated_at = new Date().toISOString()

  res.json({ element: elementToResponse(el) })
})

router.delete('/boards/elements', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM story_elements WHERE id = ?').run(req.query.elementId as string)
  res.json({})
})

// ═══ Board Resources (flat) ═══

router.get('/boards/resources', (req: Request, res: Response) => {
  const db = getDb()
  const resources = db.prepare('SELECT * FROM resources WHERE board_id = ?').all(req.query.boardId as string) as any[]
  res.json({ resources: resources.map(resourceToResponse) })
})

router.post('/boards/resources', (req: Request, res: Response) => {
  const db = getDb()
  const id = 'res-' + uid()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO resources (id, board_id, file_id, name, type, url, original_url, size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.body.boardId, req.body.fileId || null, req.body.name, req.body.type, req.body.url, req.body.originalUrl || null, req.body.size || 0, req.body.mimeType || 'image/png', now
  )
  res.json({ resource: { id, boardId: req.body.boardId, fileId: req.body.fileId || null, name: req.body.name, type: req.body.type, url: req.body.url, originalUrl: req.body.originalUrl || null, size: req.body.size || 0, mimeType: req.body.mimeType || 'image/png', createdAt: now } })
})

router.delete('/boards/resources', (req: Request, res: Response) => {
  const db = getDb()
  const r = db.prepare('SELECT url, original_url FROM resources WHERE id = ?').get(req.query.resourceId as string) as any
  if (r) {
    deleteUpload(r.url)
    if (r.original_url) deleteUpload(r.original_url)
  }
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.query.resourceId as string)
  res.json({})
})

// ═══ RESTful nested routes ═══

router.get('/boards/:id/files', (req: Request, res: Response) => {
  const db = getDb()
  let rows: any[]
  if (req.query.parentId) {
    rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? AND parent_id = ? ORDER BY sort_order').all(req.params.id, req.query.parentId as string)
  } else {
    rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? AND parent_id IS NULL ORDER BY sort_order').all(req.params.id)
  }
  res.json({ files: rows.map(fileToResponse) })
})

router.post('/boards/:id/files', (req: Request, res: Response) => {
  const db = getDb()
  const now = new Date().toISOString()
  const id = 'file-' + uid()
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM board_files WHERE board_id = ?').get(req.params.id) as { cnt: number }
  db.prepare('INSERT INTO board_files (id, board_id, parent_id, name, type, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.params.id, req.body.parentId || null, req.body.name, req.body.type || 'note', req.body.content || '', existing.cnt, now, now
  )
  res.json({ file: { id, boardId: req.params.id, parentId: req.body.parentId || null, name: req.body.name, type: req.body.type || 'note', content: req.body.content || '', sortOrder: existing.cnt, createdAt: now, updatedAt: now } })
})

router.patch('/boards/:id/files', (req: Request, res: Response) => {
  const db = getDb()
  const f = db.prepare('SELECT * FROM board_files WHERE id = ?').get(req.body.fileId) as any
  if (!f) { res.status(404).json({ error: '不存在' }); return }

  const updates: string[] = []
  const params: any[] = []

  if (req.body.content !== undefined) { updates.push('content = ?'); params.push(req.body.content); f.content = req.body.content }
  if (req.body.name) { updates.push('name = ?'); params.push(req.body.name); f.name = req.body.name }
  if (req.body.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(req.body.sortOrder); f.sort_order = req.body.sortOrder }
  if (req.body.parentId !== undefined) { updates.push('parent_id = ?'); params.push(req.body.parentId || null); f.parent_id = req.body.parentId || null }

  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(f.id)
  db.prepare(`UPDATE board_files SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  f.updated_at = new Date().toISOString()

  res.json({ file: fileToResponse(f) })
})

router.delete('/boards/:id/files', (req: Request, res: Response) => {
  deleteFileChildren(req.query.fileId as string)
  res.json({})
})

router.get('/boards/:id/elements', (req: Request, res: Response) => {
  const db = getDb()
  const elements = db.prepare('SELECT * FROM story_elements WHERE board_id = ?').all(req.params.id) as any[]
  res.json({ elements: elements.map(elementToResponse) })
})

router.post('/boards/:id/elements', (req: Request, res: Response) => {
  const db = getDb()
  const id = 'elem-' + uid()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO story_elements (id, board_id, file_id, type, name, content, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.params.id, req.body.fileId || null, req.body.type, req.body.name, req.body.content || '', req.body.color || '#6b7280', req.body.position || null, now, now
  )
  res.json({ element: { id, boardId: req.params.id, fileId: req.body.fileId || null, type: req.body.type, name: req.body.name, content: req.body.content || '', color: req.body.color || '#6b7280', position: req.body.position || null, createdAt: now, updatedAt: now } })
})

router.patch('/boards/:id/elements', (req: Request, res: Response) => {
  const db = getDb()
  const el = db.prepare('SELECT * FROM story_elements WHERE id = ?').get(req.body.elementId) as any
  if (!el) { res.status(404).json({ error: '不存在' }); return }

  const updates: string[] = []
  const params: any[] = []

  if (req.body.name !== undefined) { updates.push('name = ?'); params.push(req.body.name); el.name = req.body.name }
  if (req.body.content !== undefined) { updates.push('content = ?'); params.push(req.body.content); el.content = req.body.content }
  if (req.body.color !== undefined) { updates.push('color = ?'); params.push(req.body.color); el.color = req.body.color }
  if (req.body.position !== undefined) { updates.push('position = ?'); params.push(req.body.position); el.position = req.body.position }
  if (req.body.fileId !== undefined) { updates.push('file_id = ?'); params.push(req.body.fileId); el.file_id = req.body.fileId }

  updates.push('updated_at = ?'); params.push(new Date().toISOString())
  params.push(el.id)
  db.prepare(`UPDATE story_elements SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  el.updated_at = new Date().toISOString()

  res.json({ element: elementToResponse(el) })
})

router.delete('/boards/:id/elements', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM story_elements WHERE id = ?').run(req.query.elementId as string)
  res.json({})
})

router.get('/boards/:id/resources', (req: Request, res: Response) => {
  const db = getDb()
  const resources = db.prepare('SELECT * FROM resources WHERE board_id = ?').all(req.params.id) as any[]
  res.json({ resources: resources.map(resourceToResponse) })
})

router.post('/boards/:id/resources', (req: Request, res: Response) => {
  const db = getDb()
  const id = 'res-' + uid()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO resources (id, board_id, file_id, name, type, url, original_url, size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.params.id, req.body.fileId || null, req.body.name, req.body.type, req.body.url, req.body.originalUrl || null, req.body.size || 0, req.body.mimeType || 'image/png', now
  )
  res.json({ resource: { id, boardId: req.params.id, fileId: req.body.fileId || null, name: req.body.name, type: req.body.type, url: req.body.url, originalUrl: req.body.originalUrl || null, size: req.body.size || 0, mimeType: req.body.mimeType || 'image/png', createdAt: now } })
})

router.delete('/boards/:id/resources', (req: Request, res: Response) => {
  const db = getDb()
  const r = db.prepare('SELECT url, original_url FROM resources WHERE id = ?').get(req.query.resourceId as string) as any
  if (r) {
    deleteUpload(r.url)
    if (r.original_url) deleteUpload(r.original_url)
  }
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.query.resourceId as string)
  res.json({})
})

export default router
