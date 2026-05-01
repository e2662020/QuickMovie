import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/teams/join - Join team by invite code
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json({ error: '邀请码不能为空' }, { status: 400 })
    }

    const team = await db.team.findUnique({
      where: { inviteCode },
    })

    if (!team) {
      return NextResponse.json({ error: '邀请码无效' }, { status: 404 })
    }

    const existing = await db.teamMember.findFirst({
      where: { teamId: team.id, userId: payload.userId },
    })

    if (existing) {
      return NextResponse.json({ error: '你已经是该团队成员' }, { status: 409 })
    }

    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: payload.userId,
        role: 'editor',
      },
    })

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        icon: team.icon,
        inviteCode: team.inviteCode,
        ownerId: team.ownerId,
        role: 'editor',
      },
    })
  } catch (error) {
    console.error('Join team error:', error)
    return NextResponse.json({ error: '加入团队失败' }, { status: 500 })
  }
}

// PATCH /api/teams/join - Update member role
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { teamId, userId, role } = await request.json()

    if (!teamId || !userId || !role) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const team = await db.team.findFirst({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    if (team.ownerId !== payload.userId) {
      return NextResponse.json({ error: '只有团队拥有者可以管理权限' }, { status: 403 })
    }

    const member = await db.teamMember.findFirst({
      where: { teamId, userId },
    })

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 })
    }

    const updated = await db.teamMember.update({
      where: { id: member.id },
      data: { role },
    })

    return NextResponse.json({ member: updated })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: '更新成员权限失败' }, { status: 500 })
  }
}

// DELETE /api/teams/join - Remove member
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')

    if (!teamId || !userId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const team = await db.team.findFirst({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    // Only owner can remove members, or users can remove themselves
    if (team.ownerId !== payload.userId && payload.userId !== userId) {
      return NextResponse.json({ error: '无权限移除成员' }, { status: 403 })
    }

    // Owner cannot remove themselves
    if (team.ownerId === userId) {
      return NextResponse.json({ error: '拥有者无法离开团队' }, { status: 400 })
    }

    await db.teamMember.deleteMany({
      where: { teamId, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: '移除成员失败' }, { status: 500 })
  }
}

// GET /api/teams/join?teamId=xxx - List team members
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

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    console.error('List members error:', error)
    return NextResponse.json({ error: '获取成员列表失败' }, { status: 500 })
  }
}
