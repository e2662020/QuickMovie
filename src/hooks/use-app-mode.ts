import { useAppStore } from '@/lib/store'

export function useAppMode() {
  const appMode = useAppStore((s) => s.appMode)
  return {
    isOffline: appMode === 'offline',
    isRemote: appMode === 'remote',
    appMode,
  }
}
