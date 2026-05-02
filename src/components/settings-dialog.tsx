'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Eye,
  EyeOff,
  Key,
  Shield,
  Loader2,
  Sparkles,
  Check,
  Globe,
  Link,
} from 'lucide-react'

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    personalApiKey,
    setPersonalApiKey,
    personalEndpoint,
    setPersonalEndpoint,
    personalModel,
    setPersonalModel,
    teamApiKey,
    setTeamApiKey,
    teamEndpoint,
    setTeamEndpoint,
    teamModel,
    setTeamModel,
    webSearchEndpoint,
    setWebSearchEndpoint,
    webSearchApiKey,
    setWebSearchApiKey,
    teamWebSearchEndpoint,
    setTeamWebSearchEndpoint,
    teamWebSearchApiKey,
    setTeamWebSearchApiKey,
    token,
    currentTeam,
  } = useAppStore()

  const [personalKey, setPersonalKey] = useState(personalApiKey || '')
  const [personalEP, setPersonalEP] = useState(personalEndpoint || '')
  const [personalMdl, setPersonalMdl] = useState(personalModel || '')
  const [teamKey, setTeamKey] = useState(teamApiKey || '')
  const [teamEP, setTeamEP] = useState(teamEndpoint || '')
  const [teamMdl, setTeamMdl] = useState(teamModel || '')
  const [showPersonal, setShowPersonal] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [loadingTeamSettings, setLoadingTeamSettings] = useState(false)

  const [personalWSEndpoint, setPersonalWSEndpoint] = useState(webSearchEndpoint || '')
  const [personalWSKey, setPersonalWSKey] = useState(webSearchApiKey || '')
  const [teamWSEndpoint, setTeamWSEndpoint] = useState(teamWebSearchEndpoint || '')
  const [teamWSKey, setTeamWSKey] = useState(teamWebSearchApiKey || '')
  const [showPersonalWS, setShowPersonalWS] = useState(false)
  const [showTeamWS, setShowTeamWS] = useState(false)
  const [savingPersonalWS, setSavingPersonalWS] = useState(false)
  const [savingTeamWS, setSavingTeamWS] = useState(false)

  useEffect(() => {
    setPersonalKey(personalApiKey || '')
  }, [personalApiKey])

  useEffect(() => {
    setPersonalEP(personalEndpoint || '')
  }, [personalEndpoint])

  useEffect(() => {
    setPersonalMdl(personalModel || '')
  }, [personalModel])

  useEffect(() => {
    setTeamKey(teamApiKey || '')
  }, [teamApiKey])

  useEffect(() => {
    setTeamEP(teamEndpoint || '')
  }, [teamEndpoint])

  useEffect(() => {
    setTeamMdl(teamModel || '')
  }, [teamModel])

  useEffect(() => {
    setPersonalWSEndpoint(webSearchEndpoint || '')
  }, [webSearchEndpoint])

  useEffect(() => {
    setPersonalWSKey(webSearchApiKey || '')
  }, [webSearchApiKey])

  useEffect(() => {
    setTeamWSEndpoint(teamWebSearchEndpoint || '')
  }, [teamWebSearchEndpoint])

  useEffect(() => {
    setTeamWSKey(teamWebSearchApiKey || '')
  }, [teamWebSearchApiKey])

  useEffect(() => {
    if (open && currentTeam) {
      loadTeamSettings()
    }
  }, [open, currentTeam?.id])

  const loadTeamSettings = async () => {
    if (!currentTeam) return
    setLoadingTeamSettings(true)
    try {
      const res = await fetch(`/api/teams/settings?teamId=${encodeURIComponent(currentTeam.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (data.apiKey) {
          setTeamApiKey(data.apiKey)
          setTeamKey(data.apiKey)
        }
        if (data.endpoint) {
          setTeamEndpoint(data.endpoint)
          setTeamEP(data.endpoint)
        }
        if (data.model) {
          setTeamModel(data.model)
          setTeamMdl(data.model)
        }
        if (data.webSearchEndpoint) {
          setTeamWebSearchEndpoint(data.webSearchEndpoint)
          setTeamWSEndpoint(data.webSearchEndpoint)
        }
        if (data.webSearchApiKey) {
          setTeamWebSearchApiKey(data.webSearchApiKey)
          setTeamWSKey(data.webSearchApiKey)
        }
      }
    } catch {} finally {
      setLoadingTeamSettings(false)
    }
  }

  const handleSavePersonal = useCallback(async () => {
    setSavingPersonal(true)
    try {
      if (personalEP && !isValidUrl(personalEP)) {
        toast.error('请求地址格式不正确，请输入有效的 https:// 或 http:// 地址')
        setSavingPersonal(false)
        return
      }
      setPersonalApiKey(personalKey || null)
      setPersonalEndpoint(personalEP || null)
      setPersonalModel(personalMdl || null)
      toast.success('个人 AI 配置已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSavingPersonal(false)
    }
  }, [personalKey, personalEP, personalMdl, setPersonalApiKey, setPersonalEndpoint, setPersonalModel])

  const handleSaveTeam = useCallback(async () => {
    if (!currentTeam) return
    setSavingTeam(true)
    try {
      if (teamEP && !isValidUrl(teamEP)) {
        toast.error('请求地址格式不正确，请输入有效的 https:// 或 http:// 地址')
        setSavingTeam(false)
        return
      }
      const res = await fetch('/api/teams/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          teamId: currentTeam.id,
          apiKey: teamKey || null,
          endpoint: teamEP || null,
          model: teamMdl || null,
        }),
      })
      if (res.ok) {
        setTeamApiKey(teamKey || null)
        setTeamEndpoint(teamEP || null)
        setTeamModel(teamMdl || null)
        toast.success('团队 AI 配置已保存')
      } else {
        const data = await res.json()
        toast.error(data.error || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSavingTeam(false)
    }
  }, [currentTeam, teamKey, teamEP, token, setTeamApiKey, setTeamEndpoint])

  const isValidUrl = (url: string): boolean => {
    if (!url) return true
    try {
      const parsed = new URL(url.trim())
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }

  const handleSavePersonalWS = useCallback(async () => {
    setSavingPersonalWS(true)
    try {
      if (personalWSEndpoint && !isValidUrl(personalWSEndpoint)) {
        toast.error('请求地址格式不正确，请输入有效的 https:// 或 http:// 地址')
        setSavingPersonalWS(false)
        return
      }
      setWebSearchEndpoint(personalWSEndpoint || null)
      setWebSearchApiKey(personalWSKey || null)
      toast.success('个人网络搜索配置已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSavingPersonalWS(false)
    }
  }, [personalWSEndpoint, personalWSKey, setWebSearchEndpoint, setWebSearchApiKey])

  const handleSaveTeamWS = useCallback(async () => {
    if (!currentTeam) return
    setSavingTeamWS(true)
    try {
      if (teamWSEndpoint && !isValidUrl(teamWSEndpoint)) {
        toast.error('请求地址格式不正确，请输入有效的 https:// 或 http:// 地址')
        setSavingTeamWS(false)
        return
      }
      const res = await fetch('/api/teams/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          teamId: currentTeam.id,
          webSearchEndpoint: teamWSEndpoint || null,
          webSearchApiKey: teamWSKey || null,
        }),
      })
      if (res.ok) {
        setTeamWebSearchEndpoint(teamWSEndpoint || null)
        setTeamWebSearchApiKey(teamWSKey || null)
        toast.success('团队网络搜索配置已保存')
      } else {
        const data = await res.json()
        toast.error(data.error || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSavingTeamWS(false)
    }
  }, [currentTeam, teamWSEndpoint, teamWSKey, token, setTeamWebSearchEndpoint, setTeamWebSearchApiKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI 设置
          </DialogTitle>
          <DialogDescription>
            配置 AI 功能和网络搜索，让 AI 辅助您的创作。系统会自动使用团队或个人 API Key。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI 功能列表
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>剧本润色与优化</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>台词优化与建议</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>分镜画面描述生成</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>故事结构分析</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>策划案创意生成</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                <Globe className="h-3.5 w-3.5" />
                <span>网络实时搜索</span>
              </li>
            </ul>
          </div>

          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="ai" className="flex-1 gap-2">
                <Sparkles className="h-4 w-4" />
                AI 大模型
              </TabsTrigger>
              <TabsTrigger value="websearch" className="flex-1 gap-2">
                <Globe className="h-4 w-4" />
                网络搜索
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-4 pt-4">
              <Tabs defaultValue="personal-ai" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="personal-ai" className="flex-1 gap-2">
                    <Key className="h-4 w-4" />
                    个人
                  </TabsTrigger>
                  <TabsTrigger value="team-ai" className="flex-1 gap-2" disabled={!currentTeam}>
                    <Shield className="h-4 w-4" />
                    团队
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal-ai" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal-endpoint" className="flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 text-muted-foreground" />
                      AI 请求地址 (Endpoint)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      AI 服务的 API 端点地址。例如: https://api.openai.com/v1/chat/completions
                    </p>
                    <Input
                      id="personal-endpoint"
                      type="text"
                      placeholder="https://api.openai.com/v1/chat/completions"
                      value={personalEP}
                      onChange={(e) => setPersonalEP(e.target.value)}
                      className="font-mono text-sm"
                    />
                    {personalEP && !isValidUrl(personalEP) && (
                      <p className="text-xs text-red-500">URL 格式不正确，请输入有效的 https:// 地址</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-model">AI 模型名称 (Model)</Label>
                    <p className="text-xs text-muted-foreground">
                      使用的 AI 模型名称。例如: gpt-4o-mini, gpt-4o, claude-3-sonnet
                    </p>
                    <Input
                      id="personal-model"
                      type="text"
                      placeholder="gpt-4o-mini"
                      value={personalMdl}
                      onChange={(e) => setPersonalMdl(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-apikey">个人 AI API Key</Label>
                    <p className="text-xs text-muted-foreground">
                      输入你的 AI API Key（如 OpenAI），用于剧本润色、AI 辅助生成等功能。API Key 仅存储在本地浏览器中。
                    </p>
                    <div className="relative">
                      <Input
                        id="personal-apikey"
                        type={showPersonal ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={personalKey}
                        onChange={(e) => setPersonalKey(e.target.value)}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPersonal(!showPersonal)}
                      >
                        {showPersonal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleSavePersonal} disabled={savingPersonal} className="w-full gap-2">
                    {savingPersonal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    保存个人 AI 配置
                  </Button>
                </TabsContent>

                <TabsContent value="team-ai" className="space-y-4 pt-4">
                  {!currentTeam ? (
                    <p className="text-sm text-muted-foreground text-center py-4">请先选择一个团队</p>
                  ) : (
                    <>
                      {loadingTeamSettings ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="team-endpoint" className="flex items-center gap-1.5">
                              <Link className="h-3.5 w-3.5 text-muted-foreground" />
                              AI 请求地址 (Endpoint)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              为团队 {currentTeam.icon} {currentTeam.name} 配置的 AI 服务端点地址。
                            </p>
                            <Input
                              id="team-endpoint"
                              type="text"
                              placeholder="https://api.openai.com/v1/chat/completions"
                              value={teamEP}
                              onChange={(e) => setTeamEP(e.target.value)}
                              className="font-mono text-sm"
                            />
                            {teamEP && !isValidUrl(teamEP) && (
                              <p className="text-xs text-red-500">URL 格式不正确，请输入有效的 https:// 地址</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="team-model">AI 模型名称 (Model)</Label>
                            <p className="text-xs text-muted-foreground">
                              为团队 {currentTeam.icon} {currentTeam.name} 配置的 AI 模型名称。
                            </p>
                            <Input
                              id="team-model"
                              type="text"
                              placeholder="gpt-4o-mini"
                              value={teamMdl}
                              onChange={(e) => setTeamMdl(e.target.value)}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="team-apikey">团队 AI API Key</Label>
                            <p className="text-xs text-muted-foreground">
                              为团队 {currentTeam.icon} {currentTeam.name} 配置共享的 AI API Key。
                            </p>
                            <div className="relative">
                              <Input
                                id="team-apikey"
                                type={showTeam ? 'text' : 'password'}
                                placeholder="sk-..."
                                value={teamKey}
                                onChange={(e) => setTeamKey(e.target.value)}
                                className="pr-10 font-mono text-sm"
                              />
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowTeam(!showTeam)}
                              >
                                {showTeam ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <Button onClick={handleSaveTeam} disabled={savingTeam || loadingTeamSettings} className="w-full gap-2">
                            {savingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            保存团队 AI 配置
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="websearch" className="space-y-4 pt-4">
              <Tabs defaultValue="personal-ws" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="personal-ws" className="flex-1 gap-2">
                    <Globe className="h-4 w-4" />
                    个人
                  </TabsTrigger>
                  <TabsTrigger value="team-ws" className="flex-1 gap-2" disabled={!currentTeam}>
                    <Shield className="h-4 w-4" />
                    团队
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal-ws" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal-ws-endpoint" className="flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 text-muted-foreground" />
                      请求地址 (API Endpoint)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      网络搜索 API 的请求地址。默认使用 OpenAI Responses API，也可配置其他搜索服务地址。
                    </p>
                    <Input
                      id="personal-ws-endpoint"
                      type="text"
                      placeholder="https://api.openai.com/v1/responses"
                      value={personalWSEndpoint}
                      onChange={(e) => setPersonalWSEndpoint(e.target.value)}
                      className="font-mono text-sm"
                    />
                    {personalWSEndpoint && !isValidUrl(personalWSEndpoint) && (
                      <p className="text-xs text-red-500">URL 格式不正确，请输入有效的 https:// 地址</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-ws-key">搜索 API Key</Label>
                    <p className="text-xs text-muted-foreground">
                      用于网络搜索的 API Key。仅存储在本地浏览器中。
                    </p>
                    <div className="relative">
                      <Input
                        id="personal-ws-key"
                        type={showPersonalWS ? 'text' : 'password'}
                        placeholder="输入搜索 API Key..."
                        value={personalWSKey}
                        onChange={(e) => setPersonalWSKey(e.target.value)}
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPersonalWS(!showPersonalWS)}
                      >
                        {showPersonalWS ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleSavePersonalWS} disabled={savingPersonalWS} className="w-full gap-2">
                    {savingPersonalWS ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    保存网络搜索配置
                  </Button>
                </TabsContent>

                <TabsContent value="team-ws" className="space-y-4 pt-4">
                  {!currentTeam ? (
                    <p className="text-sm text-muted-foreground text-center py-4">请先选择一个团队</p>
                  ) : (
                    <>
                      {loadingTeamSettings ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="team-ws-endpoint" className="flex items-center gap-1.5">
                              <Link className="h-3.5 w-3.5 text-muted-foreground" />
                              请求地址 (API Endpoint)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              为团队 {currentTeam.icon} {currentTeam.name} 配置的网络搜索 API 地址。
                            </p>
                            <Input
                              id="team-ws-endpoint"
                              type="text"
                              placeholder="https://api.openai.com/v1/responses"
                              value={teamWSEndpoint}
                              onChange={(e) => setTeamWSEndpoint(e.target.value)}
                              className="font-mono text-sm"
                            />
                            {teamWSEndpoint && !isValidUrl(teamWSEndpoint) && (
                              <p className="text-xs text-red-500">URL 格式不正确，请输入有效的 https:// 地址</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="team-ws-key">搜索 API Key</Label>
                            <p className="text-xs text-muted-foreground">
                              团队共享的网络搜索 API Key。存储于服务器。
                            </p>
                            <div className="relative">
                              <Input
                                id="team-ws-key"
                                type={showTeamWS ? 'text' : 'password'}
                                placeholder="输入搜索 API Key..."
                                value={teamWSKey}
                                onChange={(e) => setTeamWSKey(e.target.value)}
                                className="pr-10 font-mono text-sm"
                              />
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowTeamWS(!showTeamWS)}
                              >
                                {showTeamWS ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <Button onClick={handleSaveTeamWS} disabled={savingTeamWS || loadingTeamSettings} className="w-full gap-2">
                            {savingTeamWS ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            保存团队网络搜索配置
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        <p className="text-[10px] text-muted-foreground text-center">
          API Key 通过加密连接传输。个人 Key 存储于本地，团队 Key 存储于服务器。请妥善保管。
        </p>
      </DialogContent>
    </Dialog>
  )
}
