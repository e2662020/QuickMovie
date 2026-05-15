import { Router } from 'express';
import { getDb, uid } from '../db.js';
import { sendTestEmail } from '../services/email.js';
const router = Router();
router.get('/setup/status', (_req, res) => {
    const db = getDb();
    const installed = db.prepare("SELECT value FROM settings WHERE key = 'installed'").get();
    res.json({ installed: installed?.value === 'true' });
});
router.post('/setup/:step', (req, res) => {
    const { step } = req.params;
    const db = getDb();
    if (step === 'complete') {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('installed', 'true')").run();
        res.json({ success: true });
        return;
    }
    if (step === 'admin') {
        const { name, email, password } = req.body;
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('admin_name', name);
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('admin_email', email);
        }
        else {
            const userId = 'user-' + uid();
            db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(userId, email, name, password, 'admin');
        }
    }
    for (const [key, value] of Object.entries(req.body)) {
        if (value === undefined || value === null)
            continue;
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`${step}_${key}`, String(value));
    }
    res.json({ success: true });
});
router.get('/setup/config', (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings WHERE key != 'installed'").all();
    const config = {};
    for (const row of rows) {
        config[row.key] = row.value;
    }
    res.json(config);
});
router.post('/setup/reset', (req, res) => {
    const { password } = req.body;
    const db = getDb();
    const adminEmailRow = db.prepare("SELECT value FROM settings WHERE key = 'admin_email'").get();
    if (!adminEmailRow) {
        res.status(400).json({ error: '系统尚未安装' });
        return;
    }
    const adminUser = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(adminEmailRow.value);
    if (!adminUser || adminUser.password_hash !== password) {
        res.status(401).json({ error: '管理员密码错误' });
        return;
    }
    db.prepare('DELETE FROM settings').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM sessions').run();
    res.json({ success: true });
});
router.post('/setup/test-email', async (req, res) => {
    const { to } = req.body;
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        res.status(400).json({ error: '无效的邮箱地址' });
        return;
    }
    const result = await sendTestEmail(to);
    if (result.success) {
        res.json({ success: true });
    }
    else {
        res.status(500).json({ success: false, error: result.error });
    }
});
export default router;
