import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentShot, context } = body

    if (!currentShot) {
      return NextResponse.json(
        { error: '请提供当前镜头信息' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const prompt = `你是一位专业的分镜设计师。请根据当前镜头，建议下一个镜头的内容。

当前镜头：${currentShot}
${context ? `剧情背景：${context}` : ''}

请分析当前镜头的特点（景别、角度、情绪等），然后建议下一个镜头应该：
1. 是什么景别
2. 拍摄什么内容
3. 如何衔接当前镜头
4. 达到什么叙事效果

用中文详细描述你的建议。`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            '你是一位专业的分镜设计师，擅长设计流畅且富有表现力的镜头衔接。',
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
    console.error('AI suggest next shot error:', error)
    return NextResponse.json(
      { error: error.message || '镜头建议失败' },
      { status: 500 }
    )
  }
}
