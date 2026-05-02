import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'
import { SYSTEM_PROMPT } from '@/lib/ai-prompts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tool, params } = body

    if (!tool) {
      return NextResponse.json(
        { error: '缺少工具名称' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    let result: any = null
    let error: string | null = null

    try {
      switch (tool) {
        case 'read_script':
          result = '需要从store中获取当前剧本数据'
          break
          
        case 'read_storyboard':
          result = '需要从store中获取当前故事板数据'
          break
          
        case 'read_proposal':
          result = '需要从store中获取当前策划案数据'
          break
          
        case 'add_scene':
          const scenePrompt = `请为这个场景提供详细的描述：
          
参数：${JSON.stringify(params)}

请用JSON格式回复，包含：
- scene_number: 场景编号
- location: 地点
- time: 时间
- characters: 涉及的角色
- action: 主要动作
- description: 场景描述`
          
          const sceneCompletion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: scenePrompt },
            ],
            thinking: { type: 'disabled' as const },
          })
          
          result = {
            success: true,
            message: '场景已添加',
            data: sceneCompletion.choices?.[0]?.message?.content,
          }
          break
          
        case 'add_shot':
          const shotPrompt = `请为这个分镜提供详细描述：
          
参数：${JSON.stringify(params)}

请用JSON格式回复，包含：
- shot_number: 分镜编号
- shot_type: 景别（全景/中景/近景/特写）
- camera_angle: 拍摄角度
- camera_movement: 摄影机运动
- description: 画面描述
- duration: 建议时长`
          
          const shotCompletion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: shotPrompt },
            ],
            thinking: { type: 'disabled' as const },
          })
          
          result = {
            success: true,
            message: '分镜已添加',
            data: shotCompletion.choices?.[0]?.message?.content,
          }
          break
          
        case 'add_dialogue':
          const dialoguePrompt = `请优化这段台词：
          
角色：${params.character || '未知'}
台词：${params.dialogue}

请提供：
1. 优化后的台词
2. 表演指导（如语气、情感等）
3. 备注（如口型、节奏等）`
          
          const dialogueCompletion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: dialoguePrompt },
            ],
            thinking: { type: 'disabled' as const },
          })
          
          result = {
            success: true,
            message: `台词已添加给 ${params.character || '角色'}`,
            data: dialogueCompletion.choices?.[0]?.message?.content,
          }
          break
          
        case 'update_element':
          result = {
            success: true,
            message: `${params.type || '元素'} 已更新`,
            data: params.updates,
          }
          break
          
        case 'suggest_next':
          const suggestPrompt = `基于以下内容，推荐下一个应该创作的部分：

${params.context || '暂无上下文信息'}

请提供：
1. 推荐的下一步（场景/台词/分镜）
2. 推荐理由
3. 具体建议`
          
          const suggestCompletion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: suggestPrompt },
            ],
            thinking: { type: 'disabled' as const },
          })
          
          result = {
            suggestion: suggestCompletion.choices?.[0]?.message?.content,
          }
          break
          
        default:
          error = `未知工具: ${tool}`
      }
    } catch (toolError: any) {
      error = toolError.message
    }

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI tool call error:', error)
    return NextResponse.json(
      { error: error.message || '工具调用失败' },
      { status: 500 }
    )
  }
}
