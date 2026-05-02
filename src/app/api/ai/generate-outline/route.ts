import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { genre, theme, mainCharacter } = body

    if (!genre || !theme || !mainCharacter) {
      return NextResponse.json(
        { error: '请提供类型、主题和主角信息' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const prompt = `你是一位资深编剧。请为以下故事创作一个详细的大纲：

类型：${genre}
主题：${theme}
主角：${mainCharacter}

请生成一个包含以下部分的故事大纲：
1. 故事起点（建置）
2. 主要冲突
3. 高潮
4. 结局
5. 关键情节点（至少5个转折点）

用中文回复，格式清晰详细。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: '你是一位资深编剧，擅长创作引人入胜的故事大纲。',
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
    console.error('AI generate outline error:', error)
    return NextResponse.json(
      { error: error.message || '大纲生成失败' },
      { status: 500 }
    )
  }
}
