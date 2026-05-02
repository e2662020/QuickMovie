import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, mood } = body

    if (!action) {
      return NextResponse.json(
        { error: '请提供场景动作描述' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const prompt = `你是一位专业的分镜设计师。请为以下场景生成详细的画面描述：

动作/情节：${action}
情绪氛围：${mood || '请根据情节自动判断合适的氛围'}

请生成包含以下要素的详细场景描述：
1. 环境设定（时间、地点、氛围）
2. 人物状态（表情、动作、位置）
3. 镜头语言（景别、角度、运动）
4. 光线氛围（自然光/人工光，明暗对比）
5. 画面构图（人物位置，画面平衡）

用中文详细描述，形成完整的分镜画面。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            '你是一位专业的分镜设计师，擅长创作富有电影感的场景描述。',
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
    console.error('AI generate scene error:', error)
    return NextResponse.json(
      { error: error.message || '场景描述生成失败' },
      { status: 500 }
    )
  }
}
