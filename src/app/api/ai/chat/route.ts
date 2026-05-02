import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, systemPrompt } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '消息格式错误' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const chatMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    if (systemPrompt) {
      chatMessages.unshift({
        role: 'assistant',
        content: systemPrompt,
      })
    }

    const completion = await zai.chat.completions.create({
      messages: chatMessages,
      thinking: { type: 'disabled' as const },
    })

    const response = completion.choices?.[0]?.message?.content

    return NextResponse.json({
      content: response || '',
    })
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error.message || 'AI处理失败' },
      { status: 500 }
    )
  }
}
