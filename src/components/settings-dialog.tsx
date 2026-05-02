'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
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
import { Eye, EyeOff, Key, Shield, Loader2, Sparkles, Check } from 'lucide-react'

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
    teamApiKey,
    setTeamApiKey,
    user,
    token,
    currentTeam,
  } = useAppStore()

  const [personalKey, setPersonalKey] = useState(personalApiKey || '')
  const [teamKey, setTeamKey] = useState(teamApiKey || '')
  const [showPersonal, setShowPersonal] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [loadingTeamKey, setLoadingTeamKey] = useState(false)

  useEffect(() => {
    setPersonalKey(personalApiKey || '')
  }, [personalApiKey])

  useEffect(() => {
    setTeamKey(teamApiKey || '')
  }, [teamApiKey])

  useEffect(() => {
    if (open && currentTeam && !teamApiKey) {
      loadTeamApiKey()
    }
  }, [open, currentTeam?.id])

  const loadTeamApiKey = async () => {
    if (!currentTeam) return
    setLoadingTeamKey(true)
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
      }
    } catch {} finally {
      setLoadingTeamKey(false)
    }
  }

  const handleSavePersonal = useCallback(async () => {
    setSavingPersonal(true)
    try {
      setPersonalApiKey(personalKey || null)
      toast.success('个人 API Key 已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setSavingPersonal(false)
    }
  }, [personalKey, setPersonalApiKey])

  const handleSaveTeam = useCallback(async () => {
    if (!currentTeam) return
    setSavingTeam(true)
    try {
      const res = await fetch('/api/teams/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          teamId: currentTeam.id,
          apiKey: teamKey || null,
        }),
      })
      if (res.ok) {
        setTeamApiKey(teamKey || null)
        toast.success('团队 API Key 已保存')
      } else {
        const data = await res.json()
        toast.error(data.error || '保存失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setSavingTeam(false)
    }
  }, [currentTeam, teamKey, token, setTeamApiKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            AI 设置
          </DialogTitle>
          <DialogDescription>
            配置 AI 功能，让 AI 辅助您的创作。系统会自动使用团队或个人 API Key。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI 功能
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
            </ul>
          </div>

          <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1 gap-2">
              <Key className="h-4 w-4" />
              个人 API
            </TabsTrigger>
            <TabsTrigger value="team" className="flex-1 gap-2" disabled={!currentTeam}>
              <Shield className="h-4 w-4" />
              团队 AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="personal-apikey">个人 API Key</Label>
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
              保存个人 API Key
            </Button>
          </TabsContent>

          <TabsContent value="team" className="space-y-4 pt-4">
            {!currentTeam ? (
              <p className="text-sm text-muted-foreground text-center py-4">请先选择一个团队</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="team-apikey">团队 AI API Key</Label>
                  <p className="text-xs text-muted-foreground">
                    为团队 {currentTeam.icon} {currentTeam.name} 配置共享的 AI API Key。团队成员将使用此 Key 调用 AI 功能。
                  </p>
                  {loadingTeamKey ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
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
                  )}
                </div>
                <Button onClick={handleSaveTeam} disabled={savingTeam || loadingTeamKey} className="w-full gap-2">
                  {savingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  保存团队 API Key
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <p className="text-[10px] text-muted-foreground text-center">
          API Key 通过加密连接传输。个人 Key 存储于本地，团队 Key 存储于服务器。请妥善保管。
        </p>
      </DialogContent>
    </Dialog>
  )
}
