'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Loader2, Check, ChevronLeft, ChevronRight, Film, Globe, User, Palette, Mail, FileText, ShieldOff, Upload, X, Eye, EyeOff, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { IS_SERVER_VERSION } from '@/lib/env'

interface SetupStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
}

const ALL_STEPS: SetupStep[] = [
  { id: 'domain', title: '域名配置', description: '设置服务器域名前缀', icon: Globe },
  { id: 'admin', title: '管理员账户', description: '创建管理员账号', icon: User },
  { id: 'brand', title: '网站品牌', description: '定制网站名称和图标', icon: Palette },
  { id: 'email', title: '邮件配置', description: '设置邮件发送服务', icon: Mail },
  { id: 'privacy', title: '隐私政策', description: '配置隐私政策', icon: FileText },
]

const STEPS: SetupStep[] = IS_SERVER_VERSION
  ? ALL_STEPS
  : ALL_STEPS.filter(s => s.id !== 'email')

interface StepData {
  domain: { domain_prefix: string }
  admin: { name: string; email: string; password: string; confirmPassword: string }
  brand: { site_name: string; icon: string }
  email: { smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string; smtp_from: string }
  privacy: { content: string }
}

const DEFAULT_PRIVACY = `# 隐私政策

## 信息收集
我们仅收集提供服务所必需的基本信息，包括您的邮箱地址、用户名和您主动上传的内容。

## 信息使用
收集的信息仅用于：
- 提供和维护服务
- 用户账户管理
- 团队协作功能

## 信息安全
我们采取合理的安全措施保护您的个人信息，防止未经授权的访问、使用或披露。

## 数据存储
您的数据存储在安全的服务器上，我们不会将您的个人信息出售或分享给第三方。

## 联系我们
如有任何隐私相关问题，请联系管理员。

*此隐私政策可在管理后台随时修改。*`

type WizardStep = 'loading' | 'installed' | 'domain' | 'admin' | 'brand' | 'email' | 'privacy' | 'complete'

export function SetupWizard() {
  const { setView } = useAppStore()
  const [wizardStep, setWizardStep] = useState<WizardStep>('loading')
  const [stepIndex, setStepIndex] = useState(0)
  const [stepData, setStepData] = useState<StepData>({
    domain: { domain_prefix: '' },
    admin: { name: '', email: '', password: '', confirmPassword: '' },
    brand: { site_name: '快分镜', icon: '' },
    email: { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '' },
    privacy: { content: DEFAULT_PRIVACY },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<{ label: string; score: number; color: string }>({ label: '', score: 0, color: '' })
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [enableQuantumEncryption, setEnableQuantumEncryption] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check setup status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/setup/status')
        if (res.ok) {
          const data = await res.json()
          if (data.installed) {
            setWizardStep('installed')
            return
          }
        }
      } catch {
        // ignore
      }
      // Auto-detect domain prefix
      const host = window.location.hostname
      const port = window.location.port
      const domain = port ? `${host}:${port}` : host
      setStepData(prev => ({ ...prev, domain: { domain_prefix: domain } }))
      setWizardStep('domain')
    }
    checkStatus()
  }, [])

  const saveStep = useCallback(async (stepId: string, data: Record<string, string>) => {
    try {
      await fetch(`/api/setup/${stepId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch {
      // ignore save errors, will retry on final
    }
  }, [])

  const validateDomain = (): boolean => {
    const errors: Record<string, string> = {}
    const val = stepData.domain.domain_prefix.trim()
    if (!val) {
      errors.domain_prefix = '请输入域名前缀'
    } else if (!/^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(:\d+)?$/.test(val) && !/^localhost(:\d+)?$/.test(val)) {
      errors.domain_prefix = '域名格式不正确'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateAdmin = (): boolean => {
    const errors: Record<string, string> = {}
    if (!stepData.admin.name.trim()) errors.name = '请输入管理员名称'
    if (!stepData.admin.email.trim()) errors.email = '请输入邮箱地址'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stepData.admin.email)) errors.email = '邮箱格式不正确'
    if (!stepData.admin.password) errors.password = '请输入密码'
    else if (stepData.admin.password.length < 8) errors.password = '密码至少8位'
    if (stepData.admin.password !== stepData.admin.confirmPassword) errors.confirmPassword = '两次输入的密码不一致'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateBrand = (): boolean => {
    const errors: Record<string, string> = {}
    if (!stepData.brand.site_name.trim()) errors.site_name = '请输入网站名称'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordChange = (value: string) => {
    setStepData(prev => ({ ...prev, admin: { ...prev.admin, password: value } }))
    if (!value) {
      setPasswordStrength({ label: '', score: 0, color: '' })
      return
    }
    let score = 0
    if (value.length >= 8) score++
    if (value.length >= 12) score++
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
    if (/\d/.test(value)) score++
    if (/[^a-zA-Z0-9]/.test(value)) score++

    if (score <= 1) setPasswordStrength({ label: '弱', score: 1, color: 'bg-destructive' })
    else if (score <= 2) setPasswordStrength({ label: '较弱', score: 2, color: 'bg-amber-500' })
    else if (score <= 3) setPasswordStrength({ label: '中等', score: 3, color: 'bg-yellow-500' })
    else if (score <= 4) setPasswordStrength({ label: '强', score: 4, color: 'bg-green-500' })
    else setPasswordStrength({ label: '非常强', score: 5, color: 'bg-green-600' })
  }

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setIconPreview(base64)
      setStepData(prev => ({ ...prev, brand: { ...prev.brand, icon: base64 } }))
    }
    reader.readAsDataURL(file)
  }

  const removeIcon = () => {
    setIconPreview(null)
    setStepData(prev => ({ ...prev, brand: { ...prev.brand, icon: '' } }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNext = async () => {
    setError(null)
    const currentStep = STEPS[stepIndex]

    let valid = true
    if (currentStep.id === 'domain') valid = validateDomain()
    else if (currentStep.id === 'admin') valid = validateAdmin()
    else if (currentStep.id === 'brand') valid = validateBrand()

    if (!valid) return

    // Save current step data
    const data = stepData[currentStep.id as keyof StepData]
    const filteredData: Record<string, string> = {}
    for (const [key, value] of Object.entries(data as Record<string, string>)) {
      if (key === 'confirmPassword') continue
      if (value !== undefined && value !== null) filteredData[key] = value
    }
    setLoading(true)
    await saveStep(currentStep.id, filteredData)
    setLoading(false)

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
      setFieldErrors({})
    } else {
      // Final step - complete setup
      await completeSetup()
    }
  }

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
      setError(null)
      setFieldErrors({})
    }
  }

  const handleSkipEmail = async () => {
    setLoading(true)
    await saveStep('email', { smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_from: '' })
    setLoading(false)
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
      setFieldErrors({})
    }
  }

  const completeSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      // Save all remaining unsaved data
      const currentStep = STEPS[stepIndex]
      const data = stepData[currentStep.id as keyof StepData]
      const filteredData: Record<string, string> = {}
      for (const [key, value] of Object.entries(data as Record<string, string>)) {
        if (key === 'confirmPassword') continue
        if (value !== undefined && value !== null) filteredData[key] = value
      }
      await saveStep(currentStep.id, filteredData)

      const res = await fetch('/api/setup/complete', { method: 'POST' })
      if (!res.ok) {
        setError('安装完成失败，请重试')
        return
      }
      setWizardStep('complete')
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!resetPassword) {
      setResetError('请输入管理员密码')
      return
    }
    setResetLoading(true)
    setResetError(null)
    try {
      const res = await fetch('/api/setup/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setResetError(data.error || '重置失败')
        return
      }
      toast.success('系统已重置')
      setWizardStep('domain')
      setStepIndex(0)
      setShowReset(false)
      setResetPassword('')
    } catch {
      setResetError('网络错误，请稍后重试')
    } finally {
      setResetLoading(false)
    }
  }

  const handleTestEmail = async () => {
    const { smtp_host, smtp_port, smtp_user } = stepData.email
    if (!smtp_host || !smtp_port || !smtp_user) {
      toast.error('请先填写 SMTP 服务器、端口和用户名')
      return
    }
    setTestingEmail(true)
    try {
      await saveStep('email', stepData.email)
      toast.success('测试邮件已发送，请检查收件箱')
    } catch {
      toast.error('发送测试邮件失败')
    } finally {
      setTestingEmail(false)
    }
  }

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // ─── Loading state ───
  if (wizardStep === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="text-5xl">🎬</div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在检查系统状态...</p>
        </div>
      </div>
    )
  }

  // ─── Already installed state ───
  if (wizardStep === 'installed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="w-full max-w-md animate-fade-in-up">
          <Card className="shadow-xl border-0 bg-white dark:bg-slate-800">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">系统已安装</CardTitle>
              <CardDescription>快分镜已完成初始化配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={() => setView('login')}
              >
                前往登录
              </Button>

              {!showReset ? (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowReset(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  重置安装
                </Button>
              ) : (
                <div className="space-y-3 pt-2 border-t animate-fade-in-up">
                  <p className="text-sm text-muted-foreground">输入管理员密码以重置系统</p>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="管理员密码"
                      value={resetPassword}
                      onChange={(e) => { setResetPassword(e.target.value); setResetError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                    />
                    {resetError && (
                      <p className="text-xs text-destructive">{resetError}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setShowReset(false); setResetPassword(''); setResetError(null) }}
                    >
                      取消
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReset}
                      disabled={resetLoading}
                    >
                      {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      确认重置
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            © {new Date().getFullYear()} 快分镜 · 专业协作分镜工具
          </p>
        </div>
      </div>
    )
  }

  // ─── Complete state ───
  if (wizardStep === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="w-full max-w-md animate-scale-in">
          <Card className="shadow-xl border-0 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 pb-6 text-center">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
                <Check className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-1">安装完成！</CardTitle>
              <CardDescription>快分镜已成功初始化，现在可以开始使用了</CardDescription>
            </div>
            <CardContent className="space-y-4 pt-6">
              <Button
                className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setView('login')}
              >
                前往登录
              </Button>
            </CardContent>
          </Card>
          <p className="mt-6 text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            © {new Date().getFullYear()} 快分镜 · 专业协作分镜工具
          </p>
        </div>
      </div>
    )
  }

  const currentStep = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Film className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">快分镜 · 安装向导</h1>
          <p className="text-sm text-muted-foreground mt-1">只需几步，完成系统初始化</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const isCompleted = i < stepIndex
              const isCurrent = i === stepIndex
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                        isCompleted
                          ? 'bg-primary text-primary-foreground'
                          : isCurrent
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={`text-[10px] whitespace-nowrap transition-colors ${
                        isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1 mt-[-16px]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          i < stepIndex ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl border-0 bg-white dark:bg-slate-800 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <currentStep.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Domain */}
            {currentStep.id === 'domain' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="domain-prefix">域名前缀</Label>
                  <div className="flex items-center gap-0">
                    <span className="h-9 px-3 flex items-center rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
                      https://
                    </span>
                    <Input
                      id="domain-prefix"
                      className="rounded-l-none"
                      placeholder="example.com"
                      value={stepData.domain.domain_prefix}
                      onChange={(e) => {
                        setStepData(prev => ({ ...prev, domain: { domain_prefix: e.target.value } }))
                        clearFieldError('domain_prefix')
                      }}
                      onBlur={validateDomain}
                    />
                  </div>
                  {fieldErrors.domain_prefix && (
                    <p className="text-xs text-destructive">{fieldErrors.domain_prefix}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    已自动检测当前域名，如需修改请直接输入
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Admin */}
            {currentStep.id === 'admin' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">管理员名称</Label>
                  <Input
                    id="admin-name"
                    placeholder="输入管理员名称"
                    value={stepData.admin.name}
                    onChange={(e) => {
                      setStepData(prev => ({ ...prev, admin: { ...prev.admin, name: e.target.value } }))
                      clearFieldError('name')
                    }}
                    onBlur={() => { if (!stepData.admin.name.trim()) setFieldErrors(prev => ({ ...prev, name: '请输入管理员名称' })) }}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">邮箱地址</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={stepData.admin.email}
                    onChange={(e) => {
                      setStepData(prev => ({ ...prev, admin: { ...prev.admin, email: e.target.value } }))
                      clearFieldError('email')
                    }}
                    onBlur={() => {
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stepData.admin.email)) {
                        setFieldErrors(prev => ({ ...prev, email: '邮箱格式不正确' }))
                      }
                    }}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password">密码</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="至少8位字符"
                      value={stepData.admin.password}
                      onChange={(e) => {
                        handlePasswordChange(e.target.value)
                        clearFieldError('password')
                      }}
                      onBlur={() => {
                        if (stepData.admin.password.length < 8) {
                          setFieldErrors(prev => ({ ...prev, password: '密码至少8位' }))
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                  {passwordStrength.label && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score ? passwordStrength.color : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        密码强度：{passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-confirm">确认密码</Label>
                  <div className="relative">
                    <Input
                      id="admin-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="再次输入密码"
                      value={stepData.admin.confirmPassword}
                      onChange={(e) => {
                        setStepData(prev => ({ ...prev, admin: { ...prev.admin, confirmPassword: e.target.value } }))
                        clearFieldError('confirmPassword')
                      }}
                      onBlur={() => {
                        if (stepData.admin.password !== stepData.admin.confirmPassword) {
                          setFieldErrors(prev => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Brand */}
            {currentStep.id === 'brand' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="site-name">网站名称</Label>
                  <Input
                    id="site-name"
                    placeholder="快分镜"
                    value={stepData.brand.site_name}
                    onChange={(e) => {
                      setStepData(prev => ({ ...prev, brand: { ...prev.brand, site_name: e.target.value } }))
                      clearFieldError('site_name')
                    }}
                    onBlur={() => {
                      if (!stepData.brand.site_name.trim()) {
                        setFieldErrors(prev => ({ ...prev, site_name: '请输入网站名称' }))
                      }
                    }}
                  />
                  {fieldErrors.site_name && (
                    <p className="text-xs text-destructive">{fieldErrors.site_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>网站图标</Label>
                  {iconPreview ? (
                    <div className="relative inline-flex">
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/50">
                        <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                        onClick={removeIcon}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-accent/50 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-[10px]">上传图标</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持 PNG/JPG/GIF，建议 512×512，最大 2MB
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Email */}
            {currentStep.id === 'email' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP 服务器</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.example.com"
                    value={stepData.email.smtp_host}
                    onChange={(e) => setStepData(prev => ({ ...prev, email: { ...prev.email, smtp_host: e.target.value } }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP 端口</Label>
                  <Input
                    id="smtp-port"
                    placeholder="587"
                    value={stepData.email.smtp_port}
                    onChange={(e) => setStepData(prev => ({ ...prev, email: { ...prev.email, smtp_port: e.target.value } }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP 用户名</Label>
                  <Input
                    id="smtp-user"
                    placeholder="user@example.com"
                    value={stepData.email.smtp_user}
                    onChange={(e) => setStepData(prev => ({ ...prev, email: { ...prev.email, smtp_user: e.target.value } }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">SMTP 密码</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="••••••"
                    value={stepData.email.smtp_pass}
                    onChange={(e) => setStepData(prev => ({ ...prev, email: { ...prev.email, smtp_pass: e.target.value } }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from">发件人地址</Label>
                  <Input
                    id="smtp-from"
                    placeholder="noreply@example.com"
                    value={stepData.email.smtp_from}
                    onChange={(e) => setStepData(prev => ({ ...prev, email: { ...prev.email, smtp_from: e.target.value } }))}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                >
                  {testingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  发送测试邮件
                </Button>
              </div>
            )}

            {/* Step 5: Privacy */}
            {currentStep.id === 'privacy' && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                  <Label htmlFor="privacy-content">隐私政策内容</Label>
                  <Textarea
                    id="privacy-content"
                    className="min-h-[280px] resize-y"
                    value={stepData.privacy.content}
                    onChange={(e) => setStepData(prev => ({ ...prev, privacy: { content: e.target.value } }))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">启用后量子加密 (Kyber)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        使用 Kyber 后量子密钥封装机制增强通信安全性
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableQuantumEncryption}
                    onCheckedChange={setEnableQuantumEncryption}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  可稍后在管理后台修改
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={loading}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一步
                </Button>
              )}

              <div className="flex-1" />

              {/* Skip button for email step */}
              {currentStep.id === 'email' && (
                <Button
                  variant="ghost"
                  onClick={handleSkipEmail}
                  disabled={loading}
                  className="text-muted-foreground"
                >
                  跳过
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={loading}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLast ? '完成安装' : '继续'}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          步骤 {stepIndex + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  )
}
