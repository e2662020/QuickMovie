import { Router } from 'express';
import { getDb } from '../db.js';
const router = Router();
router.get('/api/site-config', (req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'brand_%'").all();
    const config = {};
    for (const row of rows) {
        config[row.key.replace('brand_', '')] = row.value;
    }
    res.json({
        siteName: config.site_name || '快分镜',
        siteIcon: config.icon || null,
    });
});
export default router;
