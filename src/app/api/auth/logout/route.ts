import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = request.cookies
    const token = cookieStore.get('auth_token')?.value

    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: '登出失败' }, { status: 500 })
  }
}
