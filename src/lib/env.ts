export type AppMode = 'development' | 'production' | 'tauri'
export type BuildTarget = 'dev' | 'server' | 'tauri' | 'client'

export const APP_MODE: AppMode = (import.meta.env.VITE_APP_MODE as AppMode) || 'development'
export const BUILD_TARGET: BuildTarget = (import.meta.env.VITE_BUILD_TARGET as BuildTarget) || 'dev'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const DEFAULT_SERVER = import.meta.env.VITE_DEFAULT_SERVER || ''

export const IS_DEV = APP_MODE === 'development'
export const IS_PROD = APP_MODE === 'production'
export const IS_TAURI = APP_MODE === 'tauri'

export const IS_SERVER_VERSION = BUILD_TARGET === 'server'
export const IS_DEV_VERSION = BUILD_TARGET === 'dev' || BUILD_TARGET === 'tauri' || BUILD_TARGET === 'client'
export const IS_CLIENT_VERSION = BUILD_TARGET === 'client' || BUILD_TARGET === 'tauri'
