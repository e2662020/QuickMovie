'use client'

import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export interface ChatMessage {
  role: 'assistant' | 'user' | 'system'
  content: string
}

export interface AIGenerateOptions {
  messages: ChatMessage[]
  systemPrompt?: string
  temperature?: number
}

export interface AIEnhanceScriptOptions {
  originalScript: string
  style?: 'professional' | 'casual' | 'dramatic' | 'comedic'
  enhancement?: 'dialogue' | 'description' | 'both'
}

export interface AISuggestShotOptions {
  sceneDescription: string
  previousShot?: string
  genre?: string
}

class AIService {
  private baseUrl = '/api/ai'

  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'AI请求失败')
    }

    return response.json()
  }

  async chat(options: AIGenerateOptions): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/chat', options)
      return result.content
    } catch (error: any) {
      toast.error(error.message || 'AI对话失败')
      throw error
    }
  }

  async enhanceScript(options: AIEnhanceScriptOptions): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/enhance-script', options)
      return result.content
    } catch (error: any) {
      toast.error(error.message || '剧本润色失败')
      throw error
    }
  }

  async generateShotDescription(options: AISuggestShotOptions): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/generate-shot', options)
      return result.content
    } catch (error: any) {
      toast.error(error.message || '分镜描述生成失败')
      throw error
    }
  }

  async analyzeStoryStructure(plot: string): Promise<{
    structure: string
    characters: string[]
    themes: string[]
    suggestions: string[]
  }> {
    try {
      const result = await this.makeRequest<{
        structure: string
        characters: string[]
        themes: string[]
        suggestions: string[]
      }>('/analyze-story', { plot })
      return result
    } catch (error: any) {
      toast.error(error.message || '故事分析失败')
      throw error
    }
  }

  async generatePlotOutline(
    genre: string,
    theme: string,
    mainCharacter: string
  ): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/generate-outline', {
        genre,
        theme,
        mainCharacter,
      })
      return result.content
    } catch (error: any) {
      toast.error(error.message || '大纲生成失败')
      throw error
    }
  }

  async polishDialogue(dialogue: string, style?: string): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/polish-dialogue', {
        dialogue,
        style,
      })
      return result.content
    } catch (error: any) {
      toast.error(error.message || '台词润色失败')
      throw error
    }
  }

  async suggestNextShot(
    currentShot: string,
    context: string
  ): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/suggest-next-shot', {
        currentShot,
        context,
      })
      return result.content
    } catch (error: any) {
      toast.error(error.message || '下一个镜头建议失败')
      throw error
    }
  }

  async generateSceneDescription(
    action: string,
    mood: string
  ): Promise<string> {
    try {
      const result = await this.makeRequest<{ content: string }>('/generate-scene', {
        action,
        mood,
      })
      return result.content
    } catch (error: any) {
      toast.error(error.message || '场景描述生成失败')
      throw error
    }
  }
}

export const aiService = new AIService()

export function useAI() {
  const { personalApiKey, teamApiKey } = useAppStore()

  const hasAIKey = !!personalApiKey || !!teamApiKey

  return {
    aiService,
    hasAIKey,
    apiKey: personalApiKey || teamApiKey,
  }
}
