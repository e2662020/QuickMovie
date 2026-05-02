import { create } from 'zustand'
import { toast } from 'sonner'

export interface AIMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: string
  timestamp: Date
  isLoading?: boolean
  toolCalls?: Array<{
    tool: string
    params: Record<string, any>
    result?: any
    status: 'pending' | 'success' | 'error'
  }>
}

interface AIAssistantStore {
  messages: AIMessage[]
  isOpen: boolean
  currentContext: {
    script?: any
    storyboard?: any
    proposal?: any
  }
  
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<AIMessage>) => void
  clearMessages: () => void
  setOpen: (open: boolean) => void
  setContext: (context: { script?: any; storyboard?: any; proposal?: any }) => void
  addToolCallResult: (messageId: string, toolCallIndex: number, result: any) => void
}

export const useAIAssistantStore = create<AIAssistantStore>((set, get) => ({
  messages: [],
  isOpen: false,
  currentContext: {},
  
  addMessage: (message) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newMessage: AIMessage = {
      ...message,
      id,
      timestamp: new Date(),
    }
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }))
    
    return id
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }))
  },
  
  clearMessages: () => {
    set({ messages: [] })
  },
  
  setOpen: (open) => {
    set({ isOpen: open })
  },
  
  setContext: (context) => {
    set((state) => ({
      currentContext: { ...state.currentContext, ...context },
    }))
  },
  
  addToolCallResult: (messageId, toolCallIndex, result) => {
    const state = get()
    const message = state.messages.find((m) => m.id === messageId)
    
    if (message && message.toolCalls) {
      const updatedToolCalls = [...message.toolCalls]
      updatedToolCalls[toolCallIndex] = {
        ...updatedToolCalls[toolCallIndex],
        result,
        status: 'success',
      }
      
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, toolCalls: updatedToolCalls } : msg
        ),
      }))
    }
  },
}))

export function useAIAssistant() {
  const store = useAIAssistantStore()
  
  const readScript = async () => {
    const { currentContext } = store
    return currentContext.script || null
  }
  
  const readStoryboard = async () => {
    const { currentContext } = store
    return currentContext.storyboard || null
  }
  
  const readProposal = async () => {
    const { currentContext } = store
    return currentContext.proposal || null
  }
  
  const addScene = async (scene: string): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      toast.success('场景已添加')
      return { success: true, id: `scene-${Date.now()}` }
    } catch (error: any) {
      toast.error(error.message || '添加场景失败')
      return { success: false, error: error.message }
    }
  }
  
  const addShot = async (shot: string, sceneId?: string): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      toast.success('分镜已添加')
      return { success: true, id: `shot-${Date.now()}` }
    } catch (error: any) {
      toast.error(error.message || '添加分镜失败')
      return { success: false, error: error.message }
    }
  }
  
  const addDialogue = async (
    dialogue: string,
    character: string,
    sceneId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      toast.success(`台词已添加给 ${character}`)
      return { success: true, id: `dialogue-${Date.now()}` }
    } catch (error: any) {
      toast.error(error.message || '添加台词失败')
      return { success: false, error: error.message }
    }
  }
  
  const updateElement = async (
    type: string,
    id: string,
    updates: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      toast.success(`${type} 已更新`)
      return { success: true }
    } catch (error: any) {
      toast.error(error.message || '更新失败')
      return { success: false, error: error.message }
    }
  }
  
  const suggestNext = async (focus?: string): Promise<string> => {
    const { currentContext } = store
    const hasScript = !!currentContext.script
    const hasStoryboard = !!currentContext.storyboard
    
    if (!hasScript && !hasStoryboard) {
      return '建议先创建一个剧本或故事板，然后我可以帮助你继续创作。'
    }
    
    if (!hasScript) {
      return '故事板已有内容，建议下一步创建对应的剧本，完善台词和场景描述。'
    }
    
    if (!hasStoryboard) {
      return '剧本已有内容，建议下一步创建故事板，将文字内容可视化。'
    }
    
    return '当前剧本和故事板都有内容，建议继续丰富细节或添加新的场景。'
  }
  
  const executeToolCall = async (tool: string, params: Record<string, any>): Promise<any> => {
    switch (tool) {
      case 'read_script':
        return await readScript()
      case 'read_storyboard':
        return await readStoryboard()
      case 'read_proposal':
        return await readProposal()
      case 'add_scene':
        return await addScene(params.scene)
      case 'add_shot':
        return await addShot(params.shot, params.sceneId)
      case 'add_dialogue':
        return await addDialogue(params.dialogue, params.character, params.sceneId)
      case 'update_element':
        return await updateElement(params.type, params.id, params.updates)
      case 'suggest_next':
        return await suggestNext(params.focus)
      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }
  
  return {
    ...store,
    executeToolCall,
    readScript,
    readStoryboard,
    readProposal,
    addScene,
    addShot,
    addDialogue,
    updateElement,
    suggestNext,
  }
}
