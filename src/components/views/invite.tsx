'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ArrowLeft, Users, Loader2, LogIn, UserPlus, Search, CheckCircle2 } from 'lucide-react'
import { IconDisplay } from '@/components/icon-picker'

interface TeamInfo {
  id: string
  name: string
  icon: string
  memberCount: number
  ownerName: string
  isMember: boolean
}

export function InviteView() {
  const {
    setView,
    setTeams,
    setCurrentTeam,
    currentTeam,
    inviteCode,
    user,
    setRedirectAfterLogin,
    setInviteCode,
    teams,
  } = useAppStore()
  const [code, setCode] = useState('')
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  useEffect(() => {
    if (inviteCode) {
      setCode(inviteCode)
      lookupTeam(inviteCode)
    }
  }, [inviteCode])

  const lookupTeam = useCallback(async (codeToLookup: string) => {
    if (!codeToLookup.trim()) return
    setLookupError('')
    setTeamInfo(null)
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/teams/lookup?code=${encodeURIComponent(codeToLookup.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error || '查询失败')
        return
      }
      setTeamInfo(data)
    } catch (err) {
      console.error('Lookup team error:', err)
      setLookupError('网络错误，请重试')
    } finally {
      setLookupLoading(false)
    }
  }, [])

  const handleSearch = () => {
    lookupTeam(code)
  }

  const handleJoin = async () => {
    if (!code.trim() || !teamInfo) return

    setJoinLoading(true)
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '加入失败')
        return
      }

      toast.success(`成功加入「${data.team.name}」！`)

      const teamsRes = await fetch('/api/teams')
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
        const joined = teamsData.teams?.find((t: { id: string }) => t.id === data.team.id)
        if (joined) {
          setCurrentTeam(joined)
        }
      }

      setView('dashboard')
    } catch (err) {
      console.error('Join team error:', err)
      toast.error('加入失败，请重试')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleLoginRedirect = () => {
    if (code.trim()) setInviteCode(code.trim())
    setRedirectAfterLogin('invite')
    setView('login')
  }

  const handleRegisterRedirect = () => {
    if (code.trim()) setInviteCode(code.trim())
    setRedirectAfterLogin('invite')
    setView('register')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => user ? (currentTeam ? setView('dashboard') : setView('landing')) : setView('landing')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        {!teamInfo ? (
          <Card className="shadow-xl border-0 bg-white dark:bg-slate-800">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">加入团队</CardTitle>
              <CardDescription>
                输入团队邀请码以查找并加入协作
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入邀请码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={lookupLoading}
                    className="h-12 text-center text-lg tracking-wider font-mono flex-1"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={lookupLoading || !code.trim()}
                    size="icon"
                    className="h-12 w-12 shrink-0"
                  >
                    {lookupLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  邀请码由团队拥有者生成，例如：abc12345
                </p>
              </div>

              {lookupError && (
                <p className="text-sm text-destructive text-center">{lookupError}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-0 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 pb-6 text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-lg dark:bg-slate-700">
                <IconDisplay value={teamInfo.icon} fallback="🎬" size="lg" />
              </div>
              <CardTitle className="text-3xl mb-1">{teamInfo.name}</CardTitle>
              <CardDescription className="text-base">
                由 {teamInfo.ownerName} 创建 · {teamInfo.memberCount} 名成员
              </CardDescription>
            </div>

            <CardContent className="space-y-4 pt-6">
              {teamInfo.isMember ? (
                <>
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      你已经是「{teamInfo.name}」的成员了
                    </p>
                  </div>
                  <Button
                    className="w-full h-12"
                    variant="outline"
                    onClick={() => {
                      const team = teams?.find((t: { id: string }) => t.id === teamInfo.id)
                      if (team) setCurrentTeam(team)
                      setView('dashboard')
                    }}
                  >
                    进入团队
                  </Button>
                </>
              ) : user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    已登录为 {user.name}
                  </div>
                  <Button
                    className="w-full h-12 text-base"
                    onClick={handleJoin}
                    disabled={joinLoading}
                  >
                    {joinLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        加入中...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        加入团队
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    需要先登录或注册才能加入这个团队
                  </p>
                  <Button
                    className="w-full h-
