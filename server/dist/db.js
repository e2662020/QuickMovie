import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'quickmovie.db');
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DB_JSON_PATH = path.join(PROJECT_ROOT, 'db.json');
let db;
export function getDb() {
    if (!db) {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTables();
        migrateFromJson();
    }
    return db;
}
function initTables() {
    const d = getDb();
    d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      icon TEXT,
      invite_code TEXT UNIQUE,
      owner_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT,
      user_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      name TEXT,
      description TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS board_files (
      id TEXT PRIMARY KEY,
      board_id TEXT,
      name TEXT,
      type TEXT,
      content TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS story_elements (
      id TEXT PRIMARY KEY,
      board_id TEXT,
      file_id TEXT,
      type TEXT,
      name TEXT,
      content TEXT,
      color TEXT,
      position TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      board_id TEXT,
      file_id TEXT,
      name TEXT,
      type TEXT,
      url TEXT,
      original_url TEXT,
      size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT 'image/png',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_boards_team ON boards(team_id);
    CREATE INDEX IF NOT EXISTS idx_board_files_board ON board_files(board_id);
    CREATE INDEX IF NOT EXISTS idx_board_files_parent ON board_files(parent_id);
    CREATE INDEX IF NOT EXISTS idx_story_elements_board ON story_elements(board_id);
    CREATE INDEX IF NOT EXISTS idx_resources_board ON resources(board_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  `);
}
function migrateFromJson() {
    if (!fs.existsSync(DB_JSON_PATH))
        return;
    const d = getDb();
    const migrated = d.prepare("SELECT value FROM settings WHERE key = 'migrated_from_db_json'").get();
    if (migrated)
        return;
    try {
        const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
        const data = JSON.parse(raw);
        const insertTeam = d.prepare('INSERT OR IGNORE INTO teams (id, name, icon, invite_code, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        const insertMember = d.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, name, email, role, joined_at) VALUES (?, ?, ?, ?, ?, ?)');
        const insertBoard = d.prepare('INSERT OR IGNORE INTO boards (id, team_id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
        const insertFile = d.prepare('INSERT OR IGNORE INTO board_files (id, board_id, name, type, content, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const insertElement = d.prepare('INSERT OR IGNORE INTO story_elements (id, board_id, file_id, type, name, content, color, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const insertResource = d.prepare('INSERT OR IGNORE INTO resources (id, board_id, file_id, name, type, url, original_url, size, mime_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const insertSession = d.prepare('INSERT OR IGNORE INTO sessions (id, token, user_id, created_at) VALUES (?, ?, ?, ?)');
        const migrate = d.transaction(() => {
            if (Array.isArray(data.teams)) {
                for (const t of data.teams) {
                    insertTeam.run(t.id, t.name, t.icon || '🎬', t.inviteCode, t.ownerId, t.id.replace('team-', ''));
                }
            }
            if (data.teamMembers) {
                for (const [teamId, members] of Object.entries(data.teamMembers)) {
                    if (Array.isArray(members)) {
                        for (const m of members) {
                            insertMember.run(teamId, m.userId, m.name || '', m.email || '', m.role || 'member', m.joinedAt || new Date().toISOString());
                        }
                    }
                }
            }
            if (Array.isArray(data.boards)) {
                for (const b of data.boards) {
                    insertBoard.run(b.id, b.teamId, b.name, b.createdBy || '', b.createdAt || new Date().toISOString(), b.updatedAt || new Date().toISOString());
                }
            }
            if (Array.isArray(data.boardFiles)) {
                for (const f of data.boardFiles) {
                    insertFile.run(f.id, f.boardId, f.name, f.type || 'note', f.content || '', f.parentId || null, f.sortOrder || 0, f.createdAt || new Date().toISOString(), f.updatedAt || new Date().toISOString());
                }
            }
            if (Array.isArray(data.elements)) {
                for (const e of data.elements) {
                    insertElement.run(e.id, e.boardId, e.fileId || null, e.type, e.name, e.content || '', e.color || '#6b7280', e.position || null, e.createdAt || new Date().toISOString(), e.updatedAt || new Date().toISOString());
                }
            }
            if (Array.isArray(data.resources)) {
                for (const r of data.resources) {
                    insertResource.run(r.id, r.boardId, r.fileId || null, r.name, r.type, r.url, r.originalUrl || null, r.size || 0, r.mimeType || 'image/png', r.createdAt || new Date().toISOString());
                }
            }
            if (Array.isArray(data.sessions)) {
                for (const s of data.sessions) {
                    insertSession.run(uid(), s.token, s.userId, new Date().toISOString());
                }
            }
            d.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migrated_from_db_json', 'true')").run();
        });
        migrate();
        console.log('[db] 数据已从 db.json 迁移到 SQLite');
    }
    catch (e) {
        console.error('[db] 迁移 db.json 失败:', e);
    }
}
export function initDb() {
    getDb();
}
export function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
