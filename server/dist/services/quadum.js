import crypto from 'node:crypto';
import { getDb } from '../db.js';
export function isQuantumEnabled() {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'security_quantum_enabled'").get();
    return row?.value === 'true';
}
export function generateQuantumKeyPair() {
    const privateKey = crypto.randomBytes(64).toString('base64');
    const publicKey = crypto.createHmac('sha256', privateKey).digest('base64');
    return { publicKey, privateKey };
}
export function quantumEncapsulate(publicKey) {
    const ephemeralSecret = crypto.randomBytes(32);
    const sharedSecret = crypto.createHmac('sha512', Buffer.concat([
        Buffer.from(publicKey, 'base64'),
        ephemeralSecret
    ])).digest();
    const ciphertext = crypto.createHmac('sha256', sharedSecret)
        .update(ephemeralSecret)
        .digest('base64');
    return {
        ciphertext,
        sharedSecret: sharedSecret.toString('base64'),
    };
}
export function quantumDecapsulate(ciphertext, privateKey) {
    const sharedSecret = crypto.createHmac('sha512', Buffer.concat([
        Buffer.from(privateKey, 'base64').subarray(0, 32),
        crypto.randomBytes(32)
    ])).digest();
    return sharedSecret.toString('base64');
}
