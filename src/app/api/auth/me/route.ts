import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET() {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return NextResponse.json({ user: payload })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 })
  }
}
