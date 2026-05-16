import { useAppStore } from '@/lib/store'
import { IS_SERVER_VERSION, IS_DEV_VERSION } from '@/lib/env'

export function useAppMode() {
  const appMode = useAppStore((s) => s.appMode)
  // Server version is always online (connected to its own database)
  const effectiveMode = IS_SERVER_VERSION ? 'remote' : appMode
  return {
    isOffline: effectiveMode === 'offline',
    isRemote: effectiveMode === 'remote',
    appMode: effectiveMode,
  }
}
