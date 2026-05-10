'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ArrowLeft, Users, Loader2 } from 'lucide-react'

export function InviteView() {
  const { setView, setTeams, setCurrentTeam, currentTeam, setInviteCode, inviteCode } = useAppStore()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Get invite code from URL or store
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode) {
      setCode(urlCode)
      setInviteCode(urlCode)
    } else if (inviteCode) {
      setCode(inviteCode)
    }
  }, [searchParams, setInviteCode, inviteCode])

  const handleJoin = async () => {
    if (!code.trim()) {
      toast.error('请输入邀请码')
      return
    }

    setLoading(true)
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
      
      // Reload teams
      const teamsRes = await fetch('/api/teams')
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
        // Auto select the joined team
        const joined = teamsData.teams?.find((t: { id: string }) => t.id === data.team.id)
        if (joined) {
          setCurrentTeam(joined)
        }
      }
      
      setView('dashboard')
    } catch {
      toast.error('加入失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setView(currentTeam ? 'dashboard' : 'landing')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">加入团队</CardTitle>
            <CardDescription>
              输入团队邀请码以加入协作
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="请输入邀请码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                disabled={loading}
                className="h-12 text-center text-lg tracking-wider font-mono"
              />
              <p className="text-xs text-muted-foreground text-center">
                邀请码由团队拥有者生成，例如：abc12345
              </p>
            </div>

            <Button
              className="w-full h-12"
              onClick={handleJoin}
              disabled={loading || !code.trim()}
            >
              {loading ? (
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
