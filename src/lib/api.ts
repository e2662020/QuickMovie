import { useAppStore } from './store'
import { IS_SERVER_VERSION } from './env'

export function getApiBase(): string {
  if (IS_SERVER_VERSION) return ''

  const { serverConfig } = useAppStore.getState()
  if (serverConfig?.serverUrl && serverConfig.connectionStatus === 'connected') {
    return serverConfig.serverUrl.replace(/\/+$/, '')
  }

  return ''
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const base = getApiBase()
  const url = `${base}${path}`

  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
  }

  return fetch(url, fetchOptions)
}
