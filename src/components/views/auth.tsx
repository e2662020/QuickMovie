'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Film } from 'lucide-react'

export function AuthView() {
  const {
    currentView,
    inviteCode,
    setUser,
    setToken,
    setTeams,
    setView,
  } = useAppStore()

  const isLogin = currentView === 'login'
  const [animationKey, setAnimationKey] = useState(0)

  // Form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAnimationKey((prev) => prev + 1)
  }, [currentView])

  // ---------- validation helpers ----------
  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validateLogin(): boolean {
    if (!loginEmail.trim()) {
      setError('请输入邮箱地址')
      return false
    }
    if (!validateEmail(loginEmail)) {
      setError('邮箱格式不正确')
      return false
    }
    if (!loginPassword) {
      setError('请输入密码')
      return false
    }
    if (loginPassword.length < 6) {
      setError('密码至少6位')
      return false
    }
    return true
  }

  function validateRegister(): boolean {
    if (!registerName.trim()) {
      setError('请输入姓名')
      return false
    }
    if (registerName.trim().length > 50) {
      setError('姓名不能超过50个字符')
      return false
    }
    if (!registerEmail.trim()) {
      setError('请输入邮箱地址')
      return false
    }
    if (!validateEmail(registerEmail)) {
      setError('邮箱格式不正确')
      return false
    }
    if (!registerPassword) {
      setError('请输入密码')
      return false
    }
    if (registerPassword.length < 6) {
      setError('密码至少6位')
      return false
    }
    if (registerPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return false
    }
    return true
  }

  // ---------- API call ----------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateLogin()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }

      setUser(data.user)
      setToken(data.token)

      // Load teams
      await loadTeams(data.token)

      setView('dashboard')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateRegister()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败')
        return
      }

      setUser(data.user)
      setToken(data.token)

      // Load teams
      await loadTeams(data.token)

      setView('dashboard')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  async function loadTeams(token: string) {
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams ?? [])
      }
    } catch {
      // Non-critical – teams will load later
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <div className="mb-6 flex justify-start animate-fade-in-down">
          <button
            type="button"
            onClick={() => setView('landing')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:gap-2"
          >
            ← 返回首页
          </button>
        </div>

        <Card className="shadow-xl animate-scale-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
              <Film className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? '登录' : '注册'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? '登录你的快分镜账号'
                : '创建一个新的快分镜账号'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Invite code banner */}
            {inviteCode && (
              <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 animate-fade-in-up">
                <AlertDescription>
                  🎉 你通过邀请链接访问，注册后将自动加入团队
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="mb-4 animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Tabs */}
            <Tabs
              defaultValue={isLogin ? 'login' : 'register'}
              className="w-full"
              onValueChange={(v) => {
                setError(null)
                setView(v === 'login' ? 'login' : 'register')
              }}
            >
              <TabsList className="mx-auto grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              {/* ─── Login Form ─── */}
              <TabsContent value="login">
                <form 
                  key={animationKey} 
                  onSubmit={handleLogin} 
                  className="mt-4 space-y-4 animate-fade-in-up"
                  style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    登录
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2 transition-all duration-300 hover:bg-primary/5"
                    disabled={loading}
                    onClick={() => {
                      setLoginEmail('admin@quickmovie.cn')
                      setLoginPassword('123456')
                    }}
                  >
                    🔧 填入测试账号
                  </Button>
                </form>
              </TabsContent>

              {/* ─── Register Form ─── */}
              <TabsContent value="register">
                <form 
                  key={animationKey} 
                  onSubmit={handleRegister} 
                  className="mt-4 space-y-4 animate-fade-in-up"
                  style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">姓名</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="你的名字"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">邮箱</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密码</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="至少6位"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">确认密码</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    注册
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="justify-center text-xs text-muted-foreground">
            {isLogin ? (
              <span className="animate-fade-in">
                还没有账号？{' '}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline transition-all duration-200"
                  onClick={() => {
                    setError(null)
                    setView('register')
                  }}
                >
                  立即注册
                </button>
              </span>
            ) : (
              <span className="animate-fade-in">
                已有账号？{' '}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline transition-all duration-200"
                  onClick={() => {
                    setError(null)
                    setView('login')
                  }}
                >
                  去登录
                </button>
              </span>
            )}
          </CardFooter>
        </Card>

        {/* Copyright */}
        <p className="mt-6 text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          © {new Date().getFullYear()} 快分镜 · AI 驱动的协作分镜工具
        </p>
      </div>
    </div>
  )
}
