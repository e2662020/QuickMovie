'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { IS_SERVER_VERSION, DEFAULT_SERVER, IS_DEV, IS_DEV_VERSION } from '@/lib/env'
import type { SavedServer, ServerConfig } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Circle,
  Loader2,
  Server,
  Check,
  Plus,
  LogOut,
  ChevronRight,
} from 'lucide-react'

export function OfflineIndicator() {
  if (IS_SERVER_VERSION) return null

  const {
    appMode,
    serverConfig,
    savedServers,
    connectServer,
    disconnectServer,
    switchServer,
  } = useAppStore()

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const connectionStatus = serverConfig?.connectionStatus ?? 'disconnected'
  const isOffline = appMode === 'offline'
  const isError = appMode === 'remote' && connectionStatus === 'error'
  const isConnected = appMode === 'remote' && connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  const handleSwitchServer = async (server: SavedServer) => {
    try {
      await switchServer(server.id)
      setStatusDialogOpen(false)
    } catch (error) {
      console.error('Switch server failed:', error)
    }
  }

  const handleConnectPreset = async (url: string, name: string) => {
    try {
      await connectServer(url, name)
      setStatusDialogOpen(false)
    } catch (error) {
      console.error('Connect failed:', error)
    }
  }

  const getPresetServers = (): { name: string; url: string }[] => {
    const presets: { name: string; url: string }[] = []
    if (IS_DEV_VERSION || IS_DEV) {
      presets.push({ name: '本地开发', url: 'http://localhost:3001' })
    }
    if (DEFAULT_SERVER) {
      const entries = DEFAULT_SERVER.split(',').map((s) => s.trim()).filter(Boolean)
      for (const entry of entries) {
        const parts = entry.split('|')
        if (parts.length >= 2) {
          const name = parts[0].trim()
          const url = parts.slice(1).join('|').trim()
          if (name && url && !presets.find(p => p.url === url)) {
            presets.push({ name, url })
          }
        }
      }
    }
    return presets
  }

  const presetServers = getPresetServers()

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setStatusDialogOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              {isOffline ? (
                <Badge variant="secondary" className="gap-1.5 px-2 py-0.5">
                  <WifiOff className="h-3 w-3" />
                  <span>离线模式</span>
                </Badge>
              ) : isError ? (
                <Badge variant="destructive" className="gap-1.5 px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>连接断开</span>
                </Badge>
              ) : isConnecting ? (
                <Badge variant="secondary" className="gap-1.5 px-2 py-0.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>连接中...</span>
                </Badge>
              ) : isConnected ? (
                <Badge variant="outline" className="gap-1.5 px-2 py-0.5">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span className="hidden sm:inline">{serverConfig?.serverName || '已连接'}</span>
                </Badge>
              ) : null}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            点击查看连接状态
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Connection Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="h-5 w-5 text-orange-500" />
                  离线模式
                </>
              ) : isConnected ? (
                <>
                  <Circle className="h-4 w-4 fill-green-500 text-green-500" />
                  已连接
                </>
              ) : isError ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  连接失败
                </>
              ) : isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  连接中...
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {isOffline
                ? '当前处于离线模式，只能查看本地保存的内容'
                : isConnected
                  ? `已连接到 ${serverConfig?.serverName}`
                  : isError
                    ? '无法连接到服务器，请检查网络或尝试其他服务器'
                    : '正在连接服务器...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current Connection Status */}
            {(isConnected || serverConfig) && (
              <div className={`rounded-lg border p-3 ${isConnected ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">当前连接</span>
                  <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
                    {isConnected ? '在线' : '离线'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{serverConfig?.serverName || '未命名服务器'}</p>
                  <p className="text-xs truncate">{serverConfig?.serverUrl}</p>
                </div>
              </div>
            )}

            {/* Preset Servers */}
            {presetServers.length > 0 && (
              <>
                <div className="text-xs font-medium text-muted-foreground">预设服务器</div>
                <div className="space-y-1">
                  {presetServers.map((preset) => (
                    <button
                      key={preset.url}
                      onClick={() => handleConnectPreset(preset.url, preset.name)}
                      disabled={isConnecting}
                      className={`w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent ${
                        serverConfig?.serverUrl === preset.url ? 'border-primary bg-accent' : ''
                      } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{preset.name}</p>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{preset.url}</p>
                      </div>
                      {serverConfig?.serverUrl === preset.url && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      {!isOffline && serverConfig?.serverUrl !== preset.url && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Saved Servers */}
            {savedServers.length > 0 && (
              <>
                {presetServers.length > 0 && <Separator />}
                <div className="text-xs font-medium text-muted-foreground">已保存的服务器</div>
                <div className="space-y-1">
                  {savedServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleSwitchServer(server)}
                      disabled={isConnecting}
                      className={`w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent ${
                        serverConfig?.serverUrl === server.url ? 'border-primary bg-accent' : ''
                      } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-tight">{server.name}</p>
                          {server.isLastUsed && serverConfig?.serverUrl !== server.url && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">上次</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{server.url}</p>
                      </div>
                      {serverConfig?.serverUrl === server.url && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      {!isOffline && serverConfig?.serverUrl !== server.url && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />

            <div className="flex gap-2">
              {!isOffline && serverConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    disconnectServer()
                    setStatusDialogOpen(false)
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  断开连接
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={!isOffline && serverConfig ? 'flex-1' : 'w-full'}
                onClick={() => {
                  setStatusDialogOpen(false)
                  document.dispatchEvent(new CustomEvent('open-add-server-dialog'))
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加服务器
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
