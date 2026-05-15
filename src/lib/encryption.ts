export async function fetchPublicKey(serverUrl: string): Promise<string> {
  const res = await fetch(`${serverUrl}/api/security/public-key`)
  if (!res.ok) throw new Error('Failed to fetch public key')
  const data = await res.json()
  return data.publicKey
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const buf = new ArrayBuffer(binaryString.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToBytes(base64).buffer as ArrayBuffer
}

export async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PUBLIC KEY-----'
  const pemFooter = '-----END PUBLIC KEY-----'
  const pemContents = pemKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')

  const binaryDer = base64ToArrayBuffer(pemContents)

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export async function encryptData(data: string, publicKeyPem: string): Promise<string> {
  const publicKey = await importPublicKey(publicKeyPem)
  const encoder = new TextEncoder()
  const encoded = encoder.encode(data)

  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoded
  )

  const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey)
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    exportedAesKey
  )

  const combined = {
    iv: arrayBufferToBase64(iv.buffer),
    key: arrayBufferToBase64(encryptedKey),
    data: arrayBufferToBase64(encryptedData),
  }

  return JSON.stringify(combined)
}

export async function decryptData(encryptedPackage: string, privateKeyPem: string): Promise<string> {
  const { iv, key, data } = JSON.parse(encryptedPackage)

  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '')

  const binaryDer = base64ToArrayBuffer(pemContents)

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  )

  const encryptedKeyBuffer = base64ToArrayBuffer(key)
  const aesKeyBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKeyBuffer
  )

  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const ivBuffer = base64ToArrayBuffer(iv)
  const dataBuffer = base64ToArrayBuffer(data)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    aesKey,
    dataBuffer
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}
