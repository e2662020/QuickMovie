import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/boards/elements?boardId=xxx&type=xxx
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')
    const type = searchParams.get('type')
    const fileId = searchParams.get('fileId')

    if (!boardId) {
      return NextResponse.json({ error: '缺少导演板ID' }, { status: 400 })
    }

    const where: Record<string, unknown> = { boardId }
    if (type) where.type = type
    if (fileId) where.fileId = fileId

    const elements = await db.storyElement.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ elements })
  } catch (error) {
    console.error('List elements error:', error)
    return NextResponse.json({ error: '获取元素列表失败' }, { status: 500 })
  }
}

// POST /api/boards/elements
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { boardId, fileId, type, name, content, color, position } = await request.json()

    if (!boardId || !type || !name) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const element = await db.storyElement.create({
      data: {
        boardId,
        fileId: fileId || null,
        type,
        name,
        content: content || null,
        color: color || null,
        position: position || null,
      },
    })

    return NextResponse.json({ element }, { status: 201 })
  } catch (error) {
    console.error('Create element error:', error)
    return NextResponse.json({ error: '创建元素失败' }, { status: 500 })
  }
}

// PATCH /api/boards/elements
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { elementId, name, content, color, position } = await request.json()

    if (!elementId) {
      return NextResponse.json({ error: '缺少元素ID' }, { status: 400 })
    }

    const element = await db.storyElement.findFirst({ where: { id: elementId } })
    if (!element) {
      return NextResponse.json({ error: '元素不存在' }, { status: 404 })
    }

    const updated = await db.storyElement.update({
      where: { id: elementId },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
      },
    })

    return NextResponse.json({ element: updated })
  } catch (error) {
    console.error('Update element error:', error)
    return NextResponse.json({ error: '更新元素失败' }, { status: 500 })
  }
}

// DELETE /api/boards/elements?elementId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const elementId = searchParams.get('elementId')

    if (!elementId) {
      return NextResponse.json({ error: '缺少元素ID' }, { status: 400 })
    }

    await db.storyElement.delete({ where: { id: elementId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete element error:', error)
    return NextResponse.json({ error: '删除元素失败' }, { status: 500 })
  }
}
