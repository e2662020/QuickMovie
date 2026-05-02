import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { originalScript, style = 'professional', enhancement = 'both', apiKey, endpoint, model } = body

    if (!model) {
      return NextResponse.json(
        { error: '请提供 AI 模型名称' },
        { status: 400 }
      )
    }

    if (!originalScript) {
      return NextResponse.json(
        { error: '请提供原始剧本内容' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: '未提供 API Key，请在设置中配置' },
        { status: 401 }
      )
    }

    const chatEndpoint = endpoint || DEFAULT_OPENAI_ENDPOINT

    const systemPrompt = `你是一位专业的影视剧本编辑，擅长润色和提升剧本质量。
当前任务：${enhancement === 'dialogue' ? '润色台词' : enhancement === 'description' ? '优化场景描述' : '全面润色剧本'}
风格：${style}
请保持剧本原有的创意和情感，同时提升文字质量。`

    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请润色以下剧本：\n\n${originalScript}` },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      let errorMessage = `AI 请求失败 (${response.status})`

      if (response.status === 401 || response.status === 403) {
        errorMessage = 'API Key 无效或无权访问，请检查凭证'
      } else if (response.status === 429) {
        errorMessage = '请求频率过高，请稍候再试'
      } else if (response.status === 404) {
        errorMessage = '请求地址未找到，请检查 API 端点地址'
      }

      if (errorData?.error?.message) {
        errorMessage = errorData.error.message
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const data = await response.json()
    const responseContent = data.choices?.[0]?.message?.content

    return NextResponse.json({
      content: responseContent || '',
    })
  } catch (error: any) {
    console.error('AI enhance script error:', error)
    return NextResponse.json(
      { error: error.message || '剧本润色失败' },
      { status: 500 }
    )
  }
}
