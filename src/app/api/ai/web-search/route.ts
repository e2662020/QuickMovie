import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SEARCH_ENDPOINT = 'https://api.openai.com/v1/responses'
const SEARCH_TIMEOUT_MS = 30000

interface WebSearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
  source?: string
}

interface WebSearchResponse {
  results: WebSearchResult[]
  totalResults?: number
  searchTime?: number
}

function isValidUrl(urlString: string): boolean {
  if (!urlString || urlString.trim().length === 0) return false
  try {
    const url = new URL(urlString.trim())
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function validateSearchParams(body: any): {
  valid: boolean
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体格式错误' }
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return { valid: false, error: '请输入搜索关键词' }
  }

  if (body.query.trim().length > 500) {
    return { valid: false, error: '搜索关键词不能超过500个字符' }
  }

  if (body.endpoint && !isValidUrl(body.endpoint)) {
    return { valid: false, error: '请求地址格式不正确，请输入有效的 https:// 或 http:// 地址' }
  }

  return { valid: true }
}

function parseOpenAIWebSearchData(data: any): WebSearchResult[] {
  try {
    if (data.output && Array.isArray(data.output)) {
      return data.output
        .filter((item: any) => item.type === 'web_search_call' && item.results)
        .flatMap((item: any) =>
          item.results.map((r: any) => ({
            title: r.title || '无标题',
            url: r.url || '',
            snippet: r.snippet || r.content || r.text || '',
            publishedDate: r.published_date || r.date || undefined,
            source: r.source || r.hostname || undefined,
          }))
        )
    }

    if (data.results && Array.isArray(data.results)) {
      return data.results.map((r: any) => ({
        title: r.title || r.name || '无标题',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.content || r.text || '',
        publishedDate: r.published_date || r.date || undefined,
        source: r.source || r.hostname || undefined,
      }))
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data.map((r: any) => ({
        title: r.title || r.name || '无标题',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.summary || r.text || '',
        publishedDate: r.published_date || r.date || undefined,
        source: r.source || r.hostname || undefined,
      }))
    }

    if (data.items && Array.isArray(data.items)) {
      return data.items.map((r: any) => ({
        title: r.title || r.name || '无标题',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.snippet || '',
        publishedDate: r.published_date || r.date || undefined,
        source: r.source || r.hostname || r.displayLink || undefined,
      }))
    }

    if (data.organic_results && Array.isArray(data.organic_results)) {
      return data.organic_results.map((r: any) => ({
        title: r.title || '无标题',
        url: r.link || r.url || '',
        snippet: r.snippet || r.description || '',
        publishedDate: r.date || r.published_date || undefined,
        source: r.source || r.displayed_link || undefined,
      }))
    }

    return []
  } catch {
    return []
  }
}

async function performSearchWithOpenAI(
  query: string,
  apiKey: string,
  endpoint?: string
): Promise<WebSearchResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const searchEndpoint = endpoint || DEFAULT_SEARCH_ENDPOINT

    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search_preview' }],
        tool_choice: { type: 'web_search_preview' },
        input: query,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `请求失败 (${response.status})`

      if (response.status === 401 || response.status === 403) {
        errorMessage = 'API Key 无效或无权访问，请检查凭证'
      } else if (response.status === 429) {
        errorMessage = '请求频率过高，请稍候再试'
      } else if (response.status === 404) {
        errorMessage = '请求地址未找到，请检查 API 端点地址'
      }

      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message
        }
      } catch {}

      throw new Error(errorMessage)
    }

    const data = await response.json()
    return parseOpenAIWebSearchData(data)
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('搜索请求超时，请检查网络连接后重试')
    }
    if (error.message) {
      throw error
    }
    throw new Error('网络搜索请求失败，请检查请求地址和网络连接')
  }
}

async function performGenericSearch(
  query: string,
  apiKey: string,
  endpoint: string
): Promise<WebSearchResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        q: query,
        query,
        search_query: query,
        num: 10,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('API Key 无效或无权访问，请检查凭证')
      }
      if (response.status === 429) {
        throw new Error('请求频率过高，请稍候再试')
      }
      throw new Error(`搜索请求失败 (${response.status})`)
    }

    const data = await response.json()
    return parseOpenAIWebSearchData(data)
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('搜索请求超时，请检查网络连接后重试')
    }
    if (error.message) {
      throw error
    }
    throw new Error('网络搜索请求失败')
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()

    const validation = validateSearchParams(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const {
      query,
      endpoint,
      apiKey,
    } = body

    const searchQuery = query.trim()

    if (!apiKey) {
      return NextResponse.json(
        { error: '未配置 API Key，请在设置中配置搜索 API Key' },
        { status: 401 }
      )
    }

    let results: WebSearchResult[]

    const useEndpoint = endpoint || DEFAULT_SEARCH_ENDPOINT

    if (!isValidUrl(useEndpoint)) {
      return NextResponse.json(
        { error: '请求地址格式不正确' },
        { status: 400 }
      )
    }

    if (useEndpoint.includes('openai.com') || endpoint === '') {
      results = await performSearchWithOpenAI(searchQuery, apiKey, endpoint || undefined)
    } else {
      results = await performGenericSearch(searchQuery, apiKey, useEndpoint)
    }

    const searchTime = Date.now() - startTime

    const response: WebSearchResponse = {
      results,
      totalResults: results.length,
      searchTime,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Web search error:', error)
    return NextResponse.json(
      { error: error.message || '网络搜索失败，请稍后重试' },
      { status: 500 }
    )
  }
}
