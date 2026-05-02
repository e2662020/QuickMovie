import { NextRequest, NextResponse } from 'next/server'
import { ZAI } from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plot } = body

    if (!plot) {
      return NextResponse.json(
        { error: '请提供剧情内容' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const prompt = `你是一位专业的故事结构分析师。请分析以下剧情内容，提供：
1. 故事结构（三幕式/英雄之旅/起承转合等）
2. 主要角色分析
3. 核心主题
4. 改进建议

用JSON格式回复，包含 structure、characters、themes、suggestions 四个字段。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            '你是一位专业的故事结构分析师，擅长分析剧本和小说结构。请以JSON格式回复分析结果。',
        },
        { role: 'user', content: `${prompt}\n\n剧情内容：\n${plot}` },
      ],
      thinking: { type: 'disabled' },
    })

    const response = completion.choices?.[0]?.message?.content

    let result = {
      structure: '',
      characters: [] as string[],
      themes: [] as string[],
      suggestions: [] as string[],
    }

    try {
      const jsonMatch = response?.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI analyze story error:', error)
    return NextResponse.json(
      { error: error.message || '故事分析失败' },
      { status: 500 }
    )
  }
}
