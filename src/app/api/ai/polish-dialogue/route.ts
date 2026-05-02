import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dialogue, style } = body

    if (!dialogue) {
      return NextResponse.json(
        { error: '请提供需要润色的台词' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const styleGuide = style
      ? `风格要求：${style}`
      : '请根据台词的语境自动调整最合适的风格'

    const prompt = `你是一位专业的台词编辑。请润色以下台词：

${styleGuide}

原始台词：
${dialogue}

要求：
1. 保持角色的性格特征
2. 符合当前剧情氛围
3. 自然流畅，有表现力
4. 可以适当添加表演指导（如有需要）

用中文回复。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: '你是一位专业的台词编辑，擅长润色和优化角色台词。',
        },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })

    const response = completion.choices?.[0]?.message?.content

    return NextResponse.json({
      content: response || '',
    })
  } catch (error: any) {
    console.error('AI polish dialogue error:', error)
    return NextResponse.json(
      { error: error.message || '台词润色失败' },
      { status: 500 }
    )
  }
}
