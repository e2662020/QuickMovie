import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const KEYS_DIR = path.join(process.cwd(), 'data', 'keys')

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true })
  }

  fs.writeFileSync(path.join(KEYS_DIR, 'public.pem'), publicKey)
  fs.writeFileSync(path.join(KEYS_DIR, 'private.pem'), privateKey)

  return { publicKey, privateKey }
}

export function getPublicKey(): string | null {
  const keyPath = path.join(KEYS_DIR, 'public.pem')
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8')
  }
  return null
}

export function getPrivateKey(): string | null {
  const keyPath = path.join(KEYS_DIR, 'private.pem')
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8')
  }
  return null
}

export function encryptWithPublicKey(data: string, publicKey: string): string {
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(data, 'utf-8')
  )
  return encrypted.toString('base64')
}

export function decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    Buffer.from(encryptedData, 'base64')
  )
  return decrypted.toString('utf-8')
}

export function initCrypto(): void {
  if (!getPublicKey()) {
    generateKeyPair()
    console.log('RSA key pair generated successfully')
  }
}
