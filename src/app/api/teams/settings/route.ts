import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/teams/settings?teamId=xxx
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: '缺少团队ID' }, { status: 400 })
    }

    const membership = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: payload.userId } },
    })

    if (!membership) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { id: true, aiApiKey: true },
    })

    if (!team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    return NextResponse.json({ apiKey: team.aiApiKey || null })
  } catch (error) {
    console.error('Get team settings error:', error)
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 })
  }
}

// PATCH /api/teams/settings
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, apiKey } = body

    if (!teamId) {
      return NextResponse.json({ error: '缺少团队ID' }, { status: 400 })
    }

    const membership = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: payload.userId } },
    })

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: '只有团队拥有者和管理员可以修改设置' }, { status: 403 })
    }

    await db.team.update({
      where: { id: teamId },
      data: { aiApiKey: apiKey || null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update team settings error:', error)
    return NextResponse.json({ error: '保存设置失败' }, { status: 500 })
  }
}
