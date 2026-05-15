import { encryptData, fetchPublicKey } from './encryption'
import { useAppStore } from './store'

export async function secureApiCall(path: string, data: Record<string, unknown>): Promise<Response> {
  const { serverConfig } = useAppStore.getState()
  if (!serverConfig?.serverUrl) throw new Error('Not connected to server')

  const publicKey = await fetchPublicKey(serverConfig.serverUrl)

  const encryptedPayload = await encryptData(JSON.stringify(data), publicKey)

  return fetch(`${serverConfig.serverUrl}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encrypted: encryptedPayload }),
    credentials: 'include',
  })
}
