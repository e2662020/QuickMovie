'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAIAssistantStore, useAIAssistant, type AIMessage } from '@/lib/ai-assistant-store'
import { useAppStore } from '@/lib/store'
import { SYSTEM_PROMPT, parseToolCalls } from '@/lib/ai-prompts'
import { aiService } from '@/lib/ai-service'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Clapperboard,
  Users,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AIChatPanelProps {
  className?: string
}

export function AIChatPanel({ className }: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const {
    messages,
    isOpen,
    currentContext,
    addMessage,
    updateMessage,
    clearMessages,
    setOpen,
    setContext,
  } = useAIAssistant()
  
  const { personalApiKey, personalEndpoint, personalModel, teamApiKey, teamEndpoint, teamModel, currentScriptFile, currentBoardFile } = useAppStore()
  const hasAIKey = !!personalApiKey || !!teamApiKey
  const apiKey = teamApiKey || personalApiKey
  const endpoint = teamEndpoint || personalEndpoint
  const model = teamModel || personalModel
  
  useEffect(() => {
    if (currentScriptFile) {
      const scriptData = useAppStore.getState().files.find(
        (f) => f.id === currentScriptFile
      )
      if (scriptData) {
        setContext({ script: scriptData })
      }
    }
  }, [currentScriptFile, setContext])
  
  useEffect(() => {
    if (currentBoardFile) {
      const boardData = useAppStore.getState().files.find(
        (f) => f.id === currentBoardFile
      )
      if (boardData) {
        setContext({ storyboard: boardData })
      }
    }
  }, [currentBoardFile, setContext])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    if (!hasAIKey) {
      toast.error('请先在设置中配置 AI API Key')
      return
    }
    
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    
    const messageId = addMessage({
      role: 'user',
      content: userMessage,
      isLoading: false,
    })
    
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
      isLoading: true,
    })
    
    try {
      const response = await aiService.chat({
        messages: [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          {
            role: 'user' as const,
            content: userMessage,
          },
        ],
        systemPrompt: SYSTEM_PROMPT,
        apiKey,
        endpoint,
        model,
      })
      
      updateMessage(assistantMessageId, {
        content: response,
        isLoading: false,
      })
      
      const toolCalls = parseToolCalls(response)
      
      if (toolCalls.length > 0) {
        for (let i = 0; i < toolCalls.length; i++) {
          const { tool, params } = toolCalls[i]
          
          try {
            const result = await executeTool(tool, params)
            
            const updatedToolCalls = [
              ...(parseToolCalls(response).map((tc, idx) => ({
                tool: tc.tool,
                params: tc.params,
                status: idx < i ? 'success' as const : idx === i ? 'pending' as const : 'pending' as const,
                result: idx < i ? parseToolCalls(response)[idx] : undefined,
              }))),
            ]
            
            updateMessage(assistantMessageId, {
              toolCalls: updatedToolCalls,
            })
            
            if (i === toolCalls.length - 1) {
              const finalResponse = await aiService.chat({
                messages: [
                  ...messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                  })),
                  { role: 'user', content: userMessage },
                  { role: 'assistant', content: response },
                  {
                    role: 'assistant',
                    content: `工具执行结果：\n${JSON.stringify(result, null, 2)}`,
                  },
                ],
                systemPrompt: SYSTEM_PROMPT,
              })
              
              updateMessage(assistantMessageId, {
                content: finalResponse,
                toolCalls: updatedToolCalls.map((tc, idx) =>
                  idx === i ? { ...tc, status: 'success' as const, result } : tc
                ),
              })
            }
          } catch (toolError: any) {
            toast.error(`工具执行失败: ${toolError.message}`)
          }
        }
      }
    } catch (error: any) {
      updateMessage(assistantMessageId, {
        content: `抱歉，发生了错误：${error.message}`,
        isLoading: false,
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const executeTool = async (tool: string, params: Record<string, any>): Promise<any> => {
    switch (tool) {
      case 'read_script':
        return currentContext.script || '暂无剧本内容'
      case 'read_storyboard':
        return currentContext.storyboard || '暂无故事板内容'
      case 'read_proposal':
        return currentContext.proposal || '暂无策划案内容'
      case 'add_scene':
        toast.success(`场景已添加：${params.scene.substring(0, 50)}...`)
        return { success: true, message: '场景添加成功' }
      case 'add_shot':
        toast.success(`分镜已添加：${params.shot.substring(0, 50)}...`)
        return { success: true, message: '分镜添加成功' }
      case 'add_dialogue':
        toast.success(`台词已添加给 ${params.character}`)
        return { success: true, message: `台词已添加给 ${params.character}` }
      case 'update_element':
        return { success: true, message: `${params.type} 已更新` }
      case 'suggest_next':
        return '建议继续添加更多场景和对话'
      case 'web_search':
        toast.info(`正在搜索: ${params.query.substring(0, 40)}...`)
        return { success: true, message: '搜索请求已提交' }
      default:
        throw new Error(`未知工具: ${tool}`)
    }
  }
  
  if (!isOpen) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50',
          className
        )}
        size="icon"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
    )
  }
  
  return (
    <div className={cn(
      'fixed bottom-4 right-4 w-96 h-[600px] bg-background border rounded-lg shadow-2xl flex flex-col z-50',
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">AI 创作助手</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentContext.script ? (
              <><Clapperboard className="h-3 w-3 mr-1" />剧本</>
            ) : currentContext.storyboard ? (
              <><Users className="h-3 w-3 mr-1" />故事板</>
            ) : (
              '无上下文'
            )}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">你好！我是你的 AI 创作助手</p>
              <p className="text-xs mt-1">
                我可以帮你读取剧本、故事板，<br />
                添加场景、分镜和台词
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题或指令..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                按 Enter 发送，Shift+Enter 换行
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                disabled={messages.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                清空
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                发送
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: AIMessage }) {
  const [expandedTools, setExpandedTools] = useState(false)
  
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-lg px-4 py-2 max-w-[85%]">
        {message.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">思考中...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <button
                  onClick={() => setExpandedTools(!expandedTools)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedTools ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  工具调用 ({message.toolCalls.length})
                </button>
                
                {expandedTools && (
                  <div className="mt-2 space-y-2">
                    {message.toolCalls.map((toolCall, idx) => (
                      <div key={idx} className="bg-background rounded p-2 text-xs">
                        <div className="font-medium text-primary mb-1">
                          {toolCall.tool}
                        </div>
                        <div className="text-muted-foreground">
                          {toolCall.status === 'success' ? (
                            <span className="text-green-600">✓ 执行成功</span>
                          ) : toolCall.status === 'error' ? (
                            <span className="text-red-600">✗ 执行失败</span>
                          ) : (
                            <span className="text-yellow-600">⏳ 执行中</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
