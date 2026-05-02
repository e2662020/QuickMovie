'use client'

import { useEffect, useState } from 'react'
import { useAppStore, AppView } from '@/lib/store'
import { LandingView } from '@/components/views/landing'
import { AuthView } from '@/components/views/auth'
import { DashboardView } from '@/components/views/dashboard'
import { BoardWorkspace } from '@/components/views/board-workspace'
import { InviteView } from '@/components/views/invite'
import { AIChatPanel } from '@/components/ai/chat-panel'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { currentView, token, setUser, setView, setTeams, setToken } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has a valid session
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setView('dashboard')
            // Load teams
            const teamsRes = await fetch('/api/teams')
            if (teamsRes.ok) {
              const teamsData = await teamsRes.json()
              setTeams(teamsData.teams || [])
            }
          }
        }
      } catch (e) {
        // Not logged in, stay on landing
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [setUser, setView, setTeams, setToken])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl">🎬</div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView />
      case 'login':
      case 'register':
        return <AuthView />
      case 'dashboard':
        return <DashboardView />
      case 'board':
        return <BoardWorkspace />
      case 'invite':
        return <InviteView />
      default:
        return <LandingView />
    }
  }

  return (
    <div className="min-h-screen">
      {renderView()}
      <AIChatPanel />
    </div>
  )
}
