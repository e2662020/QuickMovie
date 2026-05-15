'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Plug,
} from 'lucide-react'

export function OfflineIndicator() {
  const {
    appMode,
    serverConfig,
    connectServer,
    disconnectServer,
  } = useAppStore()

  const [serverDialogOpen, setServerDialogOpen] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [serverName, setServerName] = useState('')
  const [connecting, setConnecting] = useState(false)

  const connectionStatus = serverConfig?.connectionStatus ?? 'disconnected'
  const isOffline = appMode === 'offline'
  const isError = appMode === 'remote' && connectionStatus === 'error'
  const isConnected = appMode === 'remote' && connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  const handleConnectServer = async () => {
    if (!serverUrl.trim()) return
    setConnecting(true)
    try {
      await connectServer(
        serverUrl.trim(),
        serverName.trim() || new URL(serverUrl.trim()).hostname
      )
      setServerDialogOpen(false)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectServer()
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {isOffline ? (
              <button
                onClick={() => {
                  setServerUrl('')
                  setServerName('')
                  setServerDialogOpen(true)
                }}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Badge variant="secondary" className="gap-1.5 px-2 py-0.5">
                  <WifiOff className="h-3 w-3" />
                  <span>离线模式</span>
                </Badge>
              </button>
            ) : isError ? (
              <button
                onClick={() => {
                  setServerUrl(serverConfig?.serverUrl || '')
                  setServerName(serverConfig?.serverName || '')
                  setServerDialogOpen(true)
                }}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Badge variant="destructive" className="gap-1.5 px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  <span>连接断开</span>
                </Badge>
              </button>
            ) : isConnecting ? (
              <Badge variant="secondary" className="gap-1.5 px-2 py-0.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>连接中...</span>
              </Badge>
            ) : isConnected ? (
              <button
                onClick={() => {
                  setServerUrl(serverConfig?.serverUrl || '')
                  setServerName(serverConfig?.serverName || '')
                  setServerDialogOpen(true)
                }}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <Badge variant="outline" className="gap-1.5 px-2 py-0.5">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span className="hidden sm:inline">{serverConfig?.serverName || '已连接'}</span>
                </Badge>
              </button>
            ) : null}
          </TooltipTrigger>
          <TooltipContent>
            {isOffline
              ? '点击添加服务器 — 当前在离线模式下工作'
              : isError
                ? '无法连接到服务器 — 点击重试'
                : isConnected
                  ? `已连接: ${serverConfig?.serverName || serverConfig?.serverUrl} — 点击管理`
                  : '连接中...'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              {isOffline ? '添加服务器' : '服务器连接'}
            </DialogTitle>
            <DialogDescription>
              {isOffline
                ? '输入服务器地址以开启在线协作模式'
                : isError
                  ? '当前服务器连接失败，尝试重新连接或切换服务器'
                  : '管理服务器连接设置'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="server-url">服务器地址</Label>
              <Input
                id="server-url"
                placeholder="例如: https://quickmovie.example.com"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnectServer()}
                disabled={connecting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server-name">服务器名称（可选）</Label>
              <Input
                id="server-name"
                placeholder="例如: 公司服务器"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnectServer()}
                disabled={connecting}
              />
            </div>

            {isConnected && serverConfig && (
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  当前连接状态
                </p>
                <p className="text-xs text-muted-foreground">
                  服务器: {serverConfig.serverName} ({serverConfig.serverUrl})
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {isConnected && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={connecting}
              >
                <Plug className="h-4 w-4 mr-2" />
                断开连接
              </Button>
            )}
            {isConnected && <div className="flex-1" />}
            <Button
              variant="outline"
              onClick={() => setServerDialogOpen(false)}
              disabled={connecting}
            >
              取消
            </Button>
            <Button
              onClick={handleConnectServer}
              disabled={connecting || !serverUrl.trim()}
            >
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Wifi className="h-4 w-4 mr-2" />
              {isConnected ? '切换服务器' : '连接'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
