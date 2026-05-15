import { Router } from 'express';
import { getPublicKey } from '../services/crypto.js';
const router = Router();
router.get('/security/public-key', (_req, res) => {
    const publicKey = getPublicKey();
    if (!publicKey) {
        return res.status(500).json({ error: 'Encryption not initialized' });
    }
    res.json({ publicKey });
});
export default router;
