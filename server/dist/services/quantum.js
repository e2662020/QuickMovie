import { getDb } from '../db.js';
export function isQuantumEnabled() {
    try {
        const db = getDb();
        const row = db.prepare("SELECT value FROM settings WHERE key = 'security_quantum_enabled'").get();
        return row?.value === 'true';
    }
    catch {
        return false;
    }
}
