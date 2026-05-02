import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sceneDescription, previousShot, genre } = body

    if (!sceneDescription) {
      return NextResponse.json(
        { error: '请提供场景描述' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    let prompt = `你是一位专业的分镜设计师。请根据以下信息生成分镜画面描述：

场景：${sceneDescription}
${genre ? `类型：${genre}` : ''}
${previousShot ? `前一个镜头：${previousShot}` : ''}

请生成一个详细的分镜画面描述，包括：
1. 景别（全景/中景/近景/特写/大特写）
2. 拍摄角度（平视/俯拍/仰拍/鸟瞰）
3. 摄影机运动（固定/推/拉/摇/移/跟）
4. 画面描述（具体的人物、场景、动作等）
5. 建议时长

用中文回复，格式清晰。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            '你是一位专业的分镜设计师，擅长创作富有表现力的分镜画面描述。',
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
    console.error('AI generate shot error:', error)
    return NextResponse.json(
      { error: error.message || '分镜描述生成失败' },
      { status: 500 }
    )
  }
}
