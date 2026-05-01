import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/boards?teamId=xxx
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

    // Check membership
    const member = await db.teamMember.findFirst({
      where: { teamId, userId: payload.userId },
    })

    if (!member) {
      return NextResponse.json({ error: '无权限查看该团队' }, { status: 403 })
    }

    const boards = await db.directorBoard.findMany({
      where: { teamId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ boards })
  } catch (error) {
    console.error('List boards error:', error)
    return NextResponse.json({ error: '获取导演板列表失败' }, { status: 500 })
  }
}

// POST /api/boards
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { name, teamId } = await request.json()

    if (!name || !teamId) {
      return NextResponse.json({ error: '名称和团队ID不能为空' }, { status: 400 })
    }

    // Check membership and permissions
    const member = await db.teamMember.findFirst({
      where: { teamId, userId: payload.userId },
    })

    if (!member || (member.role === 'viewer')) {
      return NextResponse.json({ error: '无权限创建导演板' }, { status: 403 })
    }

    const board = await db.directorBoard.create({
      data: {
        name,
        teamId,
        createdBy: payload.userId,
      },
    })

    return NextResponse.json({ board }, { status: 201 })
  } catch (error) {
    console.error('Create board error:', error)
    return NextResponse.json({ error: '创建导演板失败' }, { status: 500 })
  }
}

// PATCH /api/boards
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { boardId, name } = await request.json()

    if (!boardId || !name) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const board = await db.directorBoard.findFirst({ where: { id: boardId } })
    if (!board) {
      return NextResponse.json({ error: '导演板不存在' }, { status: 404 })
    }

    const member = await db.teamMember.findFirst({
      where: { teamId: board.teamId, userId: payload.userId },
    })

    if (!member || (member.role === 'viewer')) {
      return NextResponse.json({ error: '无权限修改' }, { status: 403 })
    }

    const updated = await db.directorBoard.update({
      where: { id: boardId },
      data: { name },
    })

    return NextResponse.json({ board: updated })
  } catch (error) {
    console.error('Update board error:', error)
    return NextResponse.json({ error: '更新导演板失败' }, { status: 500 })
  }
}

// DELETE /api/boards?boardId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')

    if (!boardId) {
      return NextResponse.json({ error: '缺少导演板ID' }, { status: 400 })
    }

    const board = await db.directorBoard.findFirst({ where: { id: boardId } })
    if (!board) {
      return NextResponse.json({ error: '导演板不存在' }, { status: 404 })
    }

    const member = await db.teamMember.findFirst({
      where: { teamId: board.teamId, userId: payload.userId },
    })

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: '无权限删除导演板' }, { status: 403 })
    }

    await db.directorBoard.delete({ where: { id: boardId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete board error:', error)
    return NextResponse.json({ error: '删除导演板失败' }, { status: 500 })
  }
}
