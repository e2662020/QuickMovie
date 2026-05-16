import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { DEFAULT_SERVER, IS_DEV } from '@/lib/env'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Server, Globe, Check, X, ChevronLeft, Circle } from 'lucide-react'

interface PresetServer {
  name: string
  url: string
}

type ViewState = 'list' | 'connecting' | 'privacy' | 'error'

function parsePresetServers(): PresetServer[] {
  const servers: PresetServer[] = []

  if (IS_DEV) {
    servers.push({ name: '本地开发', url: 'http://localhost:3001' })
  }

  if (DEFAULT_SERVER) {
    const entries = DEFAULT_SERVER.split(',').map((s) => s.trim()).filter(Boolean)
    for (const entry of entries) {
      const parts = entry.split('|')
      if (parts.length >= 2) {
        const name = parts[0].trim()
        const url = parts.slice(1).join('|').trim()
        if (name && url) {
          servers.push({ name, url })
        }
      }
    }
  }

  return servers
}

export function ServerSelect() {
  const { serverConfig, connectServer, setAppMode } = useAppStore()
  const [viewState, setViewState] = useState<ViewState>('list')
  const [manualUrl, setManualUrl] = useState('')
  const [selectedServer, setSelectedServer] = useState<PresetServer | null>(null)
  const [privacyContent, setPrivacyContent] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectSuccess, setConnectSuccess] = useState(false)
  const [connectError, setConnectError] = useState('')

  const presetServers = useMemo(() => parsePresetServers(), [])

  const resetState = useCallback(() => {
    setViewState('list')
    setSelectedServer(null)
    setPrivacyContent('')
    setErrorMessage('')
    setConnecting(false)
    setConnectSuccess(false)
    setConnectError('')
  }, [])

  const isValidUrl = useCallback((url: string): boolean => {
    if (!url) return false
    try {
      new URL(url)
      return true
    } catch {
      return url.startsWith('http://') || url.startsWith('https://')
    }
  }, [])

  const handleConnect = useCallback(async (server: PresetServer) => {
    setSelectedServer(server)
    setConnecting(true)
    setConnectError('')
    setViewState('connecting')

    const apiUrl = `${server.url}/api/privacy`

    try {
      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          setPrivacyContent(data.content)
          setViewState('privacy')
          setConnecting(false)
          return
        }
      }
    } catch {
      // Privacy endpoint not available, proceed directly
    }

    // No privacy policy, connect directly
    try {
      await connectServer(server.url, server.name)
      setConnectSuccess(true)
      setViewState('connecting')
    } catch {
      setConnectError('无法连接到服务器，请检查地址')
      setViewState('error')
    } finally {
      setConnecting(false)
    }
  }, [connectServer])

  const handlePrivacyAgree = useCallback(async () => {
    if (!selectedServer) return
    setConnecting(true)
    setViewState('connecting')

    try {
      await connectServer(selectedServer.url, selectedServer.name)
      setConnectSuccess(true)
    } catch {
      setConnectError('无法连接到服务器，请检查地址')
      setViewState('error')
    } finally {
      setConnecting(false)
    }
  }, [selectedServer, connectServer])

  const handlePrivacyRefuse = useCallback(() => {
    resetState()
  }, [resetState])

  const handleManualConnect = useCallback(() => {
    const trimmedUrl = manualUrl.trim()
    if (!isValidUrl(trimmedUrl)) {
      setConnectError('请输入有效的服务器地址')
      setViewState('error')
      return
    }

    // Normalize URL
    let normalizedUrl = trimmedUrl
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1)
    }

    handleConnect({ name: normalizedUrl.replace(/^https?:\/\//, ''), url: normalizedUrl })
  }, [manualUrl, isValidUrl, handleConnect])

  const handlePresetClick = useCallback((server: PresetServer) => {
    handleConnect(server)
  }, [handleConnect])

  const handleOfflineMode = useCallback(() => {
    setAppMode('offline')
  }, [setAppMode])

  const isConnectedTo = useCallback((url: string) => {
    return serverConfig && serverConfig.serverUrl === url && serverConfig.connectionStatus === 'connected'
  }, [serverConfig])

  if (connectSuccess && serverConfig?.connectionStatus === 'connected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-xl">连接成功</CardTitle>
              <CardDescription>正在进入应用...</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {viewState === 'connecting' && (
          <Card className="shadow-xl border-0">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              {connectError ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                  <X className="h-8 w-8 text-destructive" />
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              )}
              <CardTitle className="text-xl">
                {connectError ? '连接失败' : '正在连接服务器...'}
              </CardTitle>
              <CardDescription>
                {connectError ? connectError : (selectedServer ? selectedServer.name : '')}
              </CardDescription>
              {connectError && (
                <Button variant="outline" onClick={resetState} className="mt-2">
                  返回重试
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {viewState === 'error' && !connectError && (
          <Card className="shadow-xl border-0">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">连接失败</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
              <Button variant="outline" onClick={resetState} className="mt-2">
                返回重试
              </Button>
            </CardContent>
          </Card>
        )}

        {viewState === 'privacy' && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Server className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">隐私政策</CardTitle>
              <CardDescription>
                {selectedServer?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-64 rounded-md border p-4">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {privacyContent}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button variant="outline" onClick={handlePrivacyRefuse} className="flex-1">
                拒绝
              </Button>
              <Button onClick={handlePrivacyAgree} disabled={connecting} className="flex-1">
                {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                同意并继续
              </Button>
            </CardFooter>
          </Card>
        )}

        {viewState === 'list' && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Server className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">添加服务器</CardTitle>
              <CardDescription>
                选择或输入一个 QuickMovie 服务器地址以开始使用
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {presetServers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">预设服务器</Label>
                  <div className="space-y-2">
                    {presetServers.map((server) => (
                      <button
                        key={server.url}
                        onClick={() => handlePresetClick(server)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                          'dark:hover:bg-accent/50'
                        )}
                      >
                        <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{server.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{server.url}</div>
                        </div>
                        <Circle
                          className={cn(
                            'h-3 w-3 shrink-0',
                            isConnectedTo(server.url)
                              ? 'fill-green-500 text-green-500'
                              : 'fill-muted-foreground/30 text-muted-foreground/30'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">手动输入服务器地址</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-server.com"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualConnect()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleManualConnect}
                    disabled={!manualUrl.trim() || connecting}
                    size="default"
                  >
                    {connecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Server className="mr-2 h-4 w-4" />
                    )}
                    连接
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <div className="w-full border-t pt-4">
                <Button
                  variant="outline"
                  onClick={handleOfflineMode}
                  className="w-full"
                >
                  不选（离线使用）
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                数据将存储在本地，协作功能不可用
              </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
