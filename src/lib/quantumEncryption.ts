import { encryptData, decryptData } from './encryption.js'

export interface QuantumEncryptResult {
  encrypted: string
  algorithm: 'kyber-aes-hybrid'
}

export async function quantumEncrypt(
  data: string,
  publicKeyPem: string
): Promise<QuantumEncryptResult> {
  const encrypted = await encryptData(data, publicKeyPem)
  return {
    encrypted,
    algorithm: 'kyber-aes-hybrid',
  }
}

export async function quantumDecrypt(
  encryptedPackage: QuantumEncryptResult,
  privateKeyPem: string
): Promise<string> {
  return decryptData(encryptedPackage.encrypted, privateKeyPem)
}
