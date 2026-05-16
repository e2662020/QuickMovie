import { getDb } from '../db.js'

export function isQuantumEnabled(): boolean {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'security_quantum_enabled'").get() as { value: string } | undefined
    return row?.value === 'true'
  } catch {
    return false
  }
}
