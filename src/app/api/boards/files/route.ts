import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/boards/files?boardId=xxx&parentId=xxx
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')
    const parentId = searchParams.get('parentId')

    if (!boardId) {
      return NextResponse.json({ error: '缺少导演板ID' }, { status: 400 })
    }

    const files = await db.boardFile.findMany({
      where: {
        boardId,
        parentId: parentId || null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 })
  }
}

// POST /api/boards/files - Create file
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { boardId, parentId, name, type, content } = await request.json()

    if (!boardId || !name || !type) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const board = await db.directorBoard.findFirst({ where: { id: boardId } })
    if (!board) {
      return NextResponse.json({ error: '导演板不存在' }, { status: 404 })
    }

    const member = await db.teamMember.findFirst({
      where: { teamId: board.teamId, userId: payload.userId },
    })

    if (!member || member.role === 'viewer') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    // Get max sort order for ordering
    const siblings = await db.boardFile.findMany({
      where: { boardId, parentId: parentId || null },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    })
    const maxOrder = siblings.length > 0 ? siblings[0].sortOrder : 0

    const file = await db.boardFile.create({
      data: {
        boardId,
        parentId: parentId || null,
        name,
        type,
        content: content || null,
        sortOrder: maxOrder + 1,
      },
    })

    return NextResponse.json({ file }, { status: 201 })
  } catch (error) {
    console.error('Create file error:', error)
    return NextResponse.json({ error: '创建文件失败' }, { status: 500 })
  }
}

// PATCH /api/boards/files - Update file
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { fileId, name, content, parentId, sortOrder } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: '缺少文件ID' }, { status: 400 })
    }

    const file = await db.boardFile.findFirst({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    const updated = await db.boardFile.update({
      where: { id: fileId },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({ file: updated })
  } catch (error) {
    console.error('Update file error:', error)
    return NextResponse.json({ error: '更新文件失败' }, { status: 500 })
  }
}

// DELETE /api/boards/files?fileId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: '缺少文件ID' }, { status: 400 })
    }

    const file = await db.boardFile.findFirst({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    await db.boardFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 })
  }
}
