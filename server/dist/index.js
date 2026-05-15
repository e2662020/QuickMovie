import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, initDb } from './db.js';
import { authMiddleware, requireAuth } from './middleware/auth.js';
import { loadTestAccounts } from './utils/accounts.js';
import { initCrypto } from './services/crypto.js';
import setupRoutes from './routes/setup.js';
import { setupMiddleware } from './middleware/setup.js';
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import boardRoutes from './routes/boards.js';
import uploadRoutes from './routes/upload.js';
import securityRoutes from './routes/security.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', setupRoutes);
app.use(setupMiddleware);
app.use(authMiddleware);
function deleteUploadFile(url) {
    if (!url || !url.startsWith('/uploads/'))
        return;
    const filePath = path.join(UPLOADS_DIR, url.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (_res, filePath) => {
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        const mimeMap = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
        };
        if (mimeMap[ext]) {
            _res.setHeader('Content-Type', mimeMap[ext]);
        }
        _res.setHeader('Cache-Control', 'no-cache');
    },
}));
app.use('/api', authRoutes);
app.use('/api', teamRoutes);
app.use('/api', boardRoutes);
app.use('/api', uploadRoutes);
app.use('/api', securityRoutes);
const v1 = express.Router();
v1.use(requireAuth);
function boardToV1(b) {
    return { id: b.id, name: b.name, teamId: b.team_id, createdBy: b.created_by, createdAt: b.created_at, updatedAt: b.updated_at };
}
function fileToV1(f) {
    return { id: f.id, boardId: f.board_id, parentId: f.parent_id, name: f.name, type: f.type, content: f.content, sortOrder: f.sort_order, createdAt: f.created_at, updatedAt: f.updated_at };
}
function elementToV1(e) {
    return { id: e.id, boardId: e.board_id, fileId: e.file_id, type: e.type, name: e.name, content: e.content, color: e.color, position: e.position, createdAt: e.created_at, updatedAt: e.updated_at };
}
function resourceToV1(r) {
    return { id: r.id, boardId: r.board_id, fileId: r.file_id, name: r.name, type: r.type, url: r.url, originalUrl: r.original_url, size: r.size, mimeType: r.mime_type, createdAt: r.created_at };
}
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
v1.get('/me', (req, res) => {
    const u = req.user;
    res.json({ user: { id: u.id, email: u.email, name: u.name, roles: u.roles } });
});
v1.get('/teams', (req, res) => {
    const db = getDb();
    const teams = db.prepare('SELECT * FROM teams').all();
    const user = req.user;
    const result = teams.map(t => {
        const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(t.id);
        const member = members.find((m) => m.user_id === user.id);
        const role = member?.role || 'viewer';
        return { id: t.id, name: t.name, icon: t.icon, inviteCode: t.invite_code, ownerId: t.owner_id, role, memberCount: members.length, createdAt: t.created_at };
    });
    res.json({ teams: result });
});
v1.get('/boards', (req, res) => {
    const db = getDb();
    const teamId = req.query.teamId;
    if (!teamId) {
        res.status(400).json({ error: '缺少 teamId 参数' });
        return;
    }
    const boards = db.prepare('SELECT * FROM boards WHERE team_id = ?').all(teamId);
    res.json({ boards: boards.map(boardToV1) });
});
v1.get('/files', (req, res) => {
    const db = getDb();
    const boardId = req.query.boardId;
    if (!boardId) {
        res.status(400).json({ error: '缺少 boardId 参数' });
        return;
    }
    let rows;
    if (req.query.parentId) {
        rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? AND parent_id = ? ORDER BY sort_order').all(boardId, req.query.parentId);
    }
    else {
        rows = db.prepare('SELECT * FROM board_files WHERE board_id = ? ORDER BY sort_order').all(boardId);
    }
    res.json({ files: rows.map(fileToV1) });
});
v1.post('/files', (req, res) => {
    const db = getDb();
    const { boardId, parentId, name, type, content } = req.body;
    if (!boardId || !name) {
        res.status(400).json({ error: '缺少必要参数' });
        return;
    }
    const now = new Date().toISOString();
    const id = 'file-' + uid();
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM board_files WHERE board_id = ?').get(boardId);
    db.prepare('INSERT INTO board_files (id, board_id, parent_id, name, type, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, boardId, parentId || null, name, type || 'note', content || '', existing.cnt, now, now);
    res.json({ file: { id, boardId, parentId: parentId || null, name, type: type || 'note', content: content || '', sortOrder: existing.cnt, createdAt: now, updatedAt: now } });
});
v1.patch('/files', (req, res) => {
    const db = getDb();
    const f = db.prepare('SELECT * FROM board_files WHERE id = ?').get(req.body.fileId);
    if (!f) {
        res.status(404).json({ error: '不存在' });
        return;
    }
    const updates = [];
    const params = [];
    if (req.body.content !== undefined) {
        updates.push('content = ?');
        params.push(req.body.content);
        f.content = req.body.content;
    }
    if (req.body.name) {
        updates.push('name = ?');
        params.push(req.body.name);
        f.name = req.body.name;
    }
    if (req.body.sortOrder !== undefined) {
        updates.push('sort_order = ?');
        params.push(req.body.sortOrder);
        f.sort_order = req.body.sortOrder;
    }
    if (req.body.parentId !== undefined) {
        updates.push('parent_id = ?');
        params.push(req.body.parentId || null);
        f.parent_id = req.body.parentId || null;
    }
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(f.id);
    db.prepare(`UPDATE board_files SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    f.updated_at = new Date().toISOString();
    res.json({ file: fileToV1(f) });
});
v1.delete('/files', (req, res) => {
    const db = getDb();
    const fileId = req.query.fileId;
    if (!fileId) {
        res.status(400).json({ error: '缺少 fileId 参数' });
        return;
    }
    const idsToDelete = [fileId];
    const queue = [fileId];
    while (queue.length > 0) {
        const pid = queue.shift();
        const children = db.prepare('SELECT id FROM board_files WHERE parent_id = ?').all(pid);
        for (const child of children) {
            idsToDelete.push(child.id);
            queue.push(child.id);
        }
    }
    for (const id of idsToDelete) {
        const resources = db.prepare('SELECT url, original_url FROM resources WHERE file_id = ?').all(id);
        for (const r of resources) {
            deleteUploadFile(r.url);
            if (r.original_url)
                deleteUploadFile(r.original_url);
        }
        db.prepare('DELETE FROM resources WHERE file_id = ?').run(id);
        db.prepare('DELETE FROM story_elements WHERE file_id = ?').run(id);
    }
    for (const id of idsToDelete) {
        db.prepare('DELETE FROM board_files WHERE id = ?').run(id);
    }
    res.json({});
});
v1.get('/elements', (req, res) => {
    const db = getDb();
    const boardId = req.query.boardId;
    if (!boardId) {
        res.status(400).json({ error: '缺少 boardId 参数' });
        return;
    }
    const elements = db.prepare('SELECT * FROM story_elements WHERE board_id = ?').all(boardId);
    res.json({ elements: elements.map(elementToV1) });
});
v1.post('/elements', (req, res) => {
    const db = getDb();
    const { boardId, type, name, content, color, position, fileId } = req.body;
    if (!boardId || !type || !name) {
        res.status(400).json({ error: '缺少必要参数' });
        return;
    }
    const now = new Date().toISOString();
    const id = 'elem-' + uid();
    db.prepare('INSERT INTO story_elements (id, board_id, file_id, type, name, content, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, boardId, fileId || null, type, name, content || '', color || '#6b7280', position || null, now, now);
    res.json({ element: { id, boardId, fileId: fileId || null, type, name, content: content || '', color: color || '#6b7280', position: position || null, createdAt: now, updatedAt: now } });
});
v1.patch('/elements', (req, res) => {
    const db = getDb();
    const el = db.prepare('SELECT * FROM story_elements WHERE id = ?').get(req.body.elementId);
    if (!el) {
        res.status(404).json({ error: '不存在' });
        return;
    }
    const updates = [];
    const params = [];
    if (req.body.name !== undefined) {
        updates.push('name = ?');
        params.push(req.body.name);
        el.name = req.body.name;
    }
    if (req.body.content !== undefined) {
        updates.push('content = ?');
        params.push(req.body.content);
        el.content = req.body.content;
    }
    if (req.body.color !== undefined) {
        updates.push('color = ?');
        params.push(req.body.color);
        el.color = req.body.color;
    }
    if (req.body.position !== undefined) {
        updates.push('position = ?');
        params.push(req.body.position);
        el.position = req.body.position;
    }
    if (req.body.fileId !== undefined) {
        updates.push('file_id = ?');
        params.push(req.body.fileId);
        el.file_id = req.body.fileId;
    }
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(el.id);
    db.prepare(`UPDATE story_elements SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    el.updated_at = new Date().toISOString();
    res.json({ element: elementToV1(el) });
});
v1.delete('/elements', (req, res) => {
    const db = getDb();
    const elementId = req.query.elementId;
    if (!elementId) {
        res.status(400).json({ error: '缺少 elementId 参数' });
        return;
    }
    db.prepare('DELETE FROM story_elements WHERE id = ?').run(elementId);
    res.json({});
});
v1.get('/resources', (req, res) => {
    const db = getDb();
    const boardId = req.query.boardId;
    if (!boardId) {
        res.status(400).json({ error: '缺少 boardId 参数' });
        return;
    }
    const resources = db.prepare('SELECT * FROM resources WHERE board_id = ?').all(boardId);
    res.json({ resources: resources.map(resourceToV1) });
});
v1.delete('/resources', (req, res) => {
    const db = getDb();
    const resourceId = req.query.resourceId;
    if (!resourceId) {
        res.status(400).json({ error: '缺少 resourceId 参数' });
        return;
    }
    const r = db.prepare('SELECT url, original_url FROM resources WHERE id = ?').get(resourceId);
    if (r) {
        deleteUploadFile(r.url);
        if (r.original_url)
            deleteUploadFile(r.original_url);
    }
    db.prepare('DELETE FROM resources WHERE id = ?').run(resourceId);
    res.json({});
});
v1.all('*', (_req, res) => {
    res.status(404).json({
        error: '未知的 API 端点',
        availableEndpoints: ['/me', '/teams', '/boards', '/files', '/elements', '/resources'],
    });
});
app.use('/api/v1', v1);
initDb();
initCrypto();
if (isDev) {
    const accounts = loadTestAccounts();
    const enabledAccounts = accounts.filter(a => a.status);
    console.log('\n📋 可用测试账号:');
    for (const acc of enabledAccounts) {
        const roles = acc.roles.join(', ');
        console.log(`   📧 ${acc.username}  🔑 ${acc.password}  🏷️  ${roles}`);
    }
    console.log('');
}
app.listen(PORT, () => {
    console.log(`🚀 QuickMovie API Server 已启动: http://localhost:${PORT}`);
});
