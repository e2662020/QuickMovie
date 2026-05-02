'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Wand2,
  MessageSquare,
  FileText,
  PenTool,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { aiService, useAI } from '@/lib/ai-service'

interface AIPanelProps {
  scriptContent: string
  onEnhance: (enhanced: string | null) => void
}

export function AIPanel({ scriptContent, onEnhance }: AIPanelProps) {
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const { hasAIKey } = useAI()

  const handleEnhance = async (type: 'dialogue' | 'description' | 'both') => {
    if (!scriptContent) {
      toast.error('请先输入剧本内容')
      return
    }

    if (!hasAIKey) {
      toast.error('请先在设置中配置 AI API Key')
      return
    }

    setLoading(true)
    setLoadingAction('润色中...')

    try {
      const enhanced = await aiService.enhanceScript({
        originalScript: scriptContent,
        style: 'professional',
        enhancement: type,
      })
      onEnhance(enhanced)
      toast.success('剧本润色完成')
    } catch (error: any) {
      toast.error(error.message || '润色失败')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const handlePolishDialogue = async (dialogue: string) => {
    if (!dialogue) {
      toast.error('请选择要润色的台词')
      return
    }

    if (!hasAIKey) {
      toast.error('请先在设置中配置 AI API Key')
      return
    }

    setLoading(true)
    setLoadingAction('润色台词中...')

    try {
      const polished = await aiService.polishDialogue(dialogue, 'natural')
      toast.success('台词润色完成')
      onEnhance(polished)
    } catch (error: any) {
      toast.error(error.message || '润色失败')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const handleSuggestDialogue = async () => {
    if (!scriptContent) {
      toast.error('请先输入剧本内容')
      return
    }

    if (!hasAIKey) {
      toast.error('请先在设置中配置 AI API Key')
      return
    }

    setLoading(true)
    setLoadingAction('生成台词建议中...')

    try {
      const suggestion = await aiService.chat({
        messages: [
          {
            role: 'user',
            content: `基于以下剧本内容，生成几个自然的台词建议：\n\n${scriptContent}`,
          },
        ],
        systemPrompt:
          '你是一位专业编剧，擅长创作自然、富有表现力的角色台词。请基于给定的剧本内容，生成3-5个台词建议，每个建议标注适合的角色和情境。',
      })

      toast.success('台词建议生成完成')
      onEnhance(suggestion)
    } catch (error: any) {
      toast.error(error.message || '生成失败')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const handleStoryAnalysis = async () => {
    if (!scriptContent) {
      toast.error('请先输入剧本内容')
      return
    }

    if (!hasAIKey) {
      toast.error('请先在设置中配置 AI API Key')
      return
    }

    setLoading(true)
    setLoadingAction('分析故事结构中...')

    try {
      const analysis = await aiService.analyzeStoryStructure(scriptContent)
      toast.success('故事分析完成')
      console.log('Story Analysis:', analysis)
      toast.info(
        `发现 ${analysis.characters.length} 个角色，${analysis.themes.length} 个主题`
      )
    } catch (error: any) {
      toast.error(error.message || '分析失败')
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 gap-1.5 text-xs ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className="hidden md:inline">AI 助手</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleEnhance('both')} disabled={loading}>
          <Wand2 className="mr-2 h-4 w-4" />
          <span>润色剧本</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEnhance('dialogue')} disabled={loading}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>润色台词</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEnhance('description')} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          <span>优化场景描述</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSuggestDialogue} disabled={loading}>
          <Lightbulb className="mr-2 h-4 w-4" />
          <span>台词建议</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStoryAnalysis} disabled={loading}>
          <PenTool className="mr-2 h-4 w-4" />
          <span>故事分析</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
