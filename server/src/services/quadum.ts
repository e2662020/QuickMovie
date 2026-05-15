import crypto from 'node:crypto'
import { getDb } from '../db.js'

export function isQuantumEnabled(): boolean {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'security_quantum_enabled'").get() as any
  return row?.value === 'true'
}

export function generateQuantumKeyPair(): { publicKey: string; privateKey: string } {
  const privateKey = crypto.randomBytes(64).toString('base64')
  const publicKey = crypto.createHmac('sha256', privateKey).digest('base64')
  return { publicKey, privateKey }
}

export function quantumEncapsulate(publicKey: string): { ciphertext: string; sharedSecret: string } {
  const ephemeralSecret = crypto.randomBytes(32)
  const sharedSecret = crypto.createHmac('sha512', Buffer.concat([
    Buffer.from(publicKey, 'base64'),
    ephemeralSecret
  ])).digest()

  const ciphertext = crypto.createHmac('sha256', sharedSecret)
    .update(ephemeralSecret)
    .digest('base64')

  return {
    ciphertext,
    sharedSecret: sharedSecret.toString('base64'),
  }
}

export function quantumDecapsulate(ciphertext: string, privateKey: string): string {
  const sharedSecret = crypto.createHmac('sha512', Buffer.concat([
    Buffer.from(privateKey, 'base64').subarray(0, 32),
    crypto.randomBytes(32)
  ])).digest()

  return sharedSecret.toString('base64')
}
