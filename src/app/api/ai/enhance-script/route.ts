import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { originalScript, style = 'professional', enhancement = 'both' } = body

    if (!originalScript) {
      return NextResponse.json(
        { error: '请提供原始剧本内容' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const systemPrompt = `你是一位专业的影视剧本编辑，擅长润色和提升剧本质量。
当前任务：${enhancement === 'dialogue' ? '润色台词' : enhancement === 'description' ? '优化场景描述' : '全面润色剧本'}
风格：${style}
请保持剧本原有的创意和情感，同时提升文字质量。`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `请润色以下剧本：\n\n${originalScript}` },
      ],
      thinking: { type: 'disabled' },
    })

    const response = completion.choices?.[0]?.message?.content

    return NextResponse.json({
      content: response || '',
    })
  } catch (error: any) {
    console.error('AI enhance script error:', error)
    return NextResponse.json(
      { error: error.message || '剧本润色失败' },
      { status: 500 }
    )
  }
}
