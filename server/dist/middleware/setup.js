import { getDb } from '../db.js';
const SETUP_EXEMPT_PREFIXES = ['/api/setup', '/uploads', '/api/auth/login', '/api/auth/register'];
export function setupMiddleware(req, res, next) {
    if (req.path === '/setup') {
        return next();
    }
    for (const prefix of SETUP_EXEMPT_PREFIXES) {
        if (req.path.startsWith(prefix)) {
            return next();
        }
    }
    const db = getDb();
    const installed = db.prepare("SELECT value FROM settings WHERE key = 'installed'").get();
    if (!installed || installed.value !== 'true') {
        if (req.path.startsWith('/api')) {
            return res.status(503).json({ error: 'Server not initialized', redirect: '/setup' });
        }
        return res.redirect('/setup');
    }
    next();
}
