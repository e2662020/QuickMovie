import { Router } from 'express';
import { getPublicKey } from '../services/crypto.js';
import { getDb } from '../db.js';
import { isQuantumEnabled } from '../services/quantum.js';
const router = Router();
router.get('/security/public-key', (_req, res) => {
    const publicKey = getPublicKey();
    if (!publicKey) {
        return res.status(500).json({ error: 'Encryption not initialized' });
    }
    res.json({ publicKey });
});
router.post('/security/quantum/toggle', (req, res) => {
    const { enabled } = req.body;
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('security_quantum_enabled', ?)").run(String(!!enabled));
    res.json({ quantumEnabled: !!enabled });
});
router.get('/security/quantum/status', (_req, res) => {
    res.json({ quantumEnabled: isQuantumEnabled() });
});
export default router;
