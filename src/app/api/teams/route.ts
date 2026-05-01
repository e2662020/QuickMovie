import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const memberships = await db.teamMember.findMany({
      where: { userId: payload.userId },
      include: {
        team: {
          include: {
            _count: { select: { members: true, boards: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      icon: m.team.icon,
      inviteCode: m.team.inviteCode,
      ownerId: m.team.ownerId,
      role: m.role,
      memberCount: m.team._count.members,
      boardCount: m.team._count.boards,
    }))

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('List teams error:', error)
    return NextResponse.json({ error: '获取团队列表失败' }, { status: 500 })
  }
}

// POST /api/teams - Create a team
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { name, icon } = await request.json()

    if (!name) {
      return NextResponse.json({ error: '团队名称不能为空' }, { status: 400 })
    }

    const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 8)

    const team = await db.team.create({
      data: {
        name,
        icon: icon || null,
        inviteCode,
        ownerId: payload.userId,
      },
    })

    // Add creator as owner
    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: payload.userId,
        role: 'owner',
      },
    })

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        icon: team.icon,
        inviteCode: team.inviteCode,
        ownerId: team.ownerId,
        role: 'owner',
        memberCount: 1,
        boardCount: 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json({ error: '创建团队失败' }, { status: 500 })
  }
}

// PATCH /api/teams - Update team
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { teamId, name, icon } = await request.json()

    const team = await db.team.findFirst({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    if (team.ownerId !== payload.userId) {
      const member = await db.teamMember.findFirst({
        where: { teamId, userId: payload.userId },
      })
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return NextResponse.json({ error: '无权限修改团队' }, { status: 403 })
      }
    }

    const updated = await db.team.update({
      where: { id: teamId },
      data: { name, icon },
    })

    return NextResponse.json({ team: updated })
  } catch (error) {
    console.error('Update team error:', error)
    return NextResponse.json({ error: '更新团队失败' }, { status: 500 })
  }
}

// DELETE /api/teams - Delete team
export async function DELETE(request: NextRequest) {
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

    const team = await db.team.findFirst({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    if (team.ownerId !== payload.userId) {
      return NextResponse.json({ error: '只有团队拥有者可以删除团队' }, { status: 403 })
    }

    await db.team.delete({ where: { id: teamId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json({ error: '删除团队失败' }, { status: 500 })
  }
}
