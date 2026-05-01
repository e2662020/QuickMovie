import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/boards/resources?boardId=xxx&fileId=xxx
export async function GET(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')
    const fileId = searchParams.get('fileId')

    if (!boardId) {
      return NextResponse.json({ error: '缺少导演板ID' }, { status: 400 })
    }

    const where: Record<string, unknown> = { boardId }
    if (fileId) where.fileId = fileId

    const resources = await db.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ resources })
  } catch (error) {
    console.error('List resources error:', error)
    return NextResponse.json({ error: '获取资源列表失败' }, { status: 500 })
  }
}

// POST /api/boards/resources
export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { boardId, fileId, name, type, url, originalUrl, size, mimeType } = body

    if (!boardId || !name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const resource = await db.resource.create({
      data: {
        boardId,
        fileId: fileId || null,
        name,
        type: type || 'file',
        url,
        originalUrl: originalUrl || null,
        size: size || null,
        mimeType: mimeType || null,
      },
    })

    return NextResponse.json({ resource })
  } catch (error) {
    console.error('Create resource error:', error)
    return NextResponse.json({ error: '创建资源失败' }, { status: 500 })
  }
}

// DELETE /api/boards/resources?resourceId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get('resourceId')

    if (!resourceId) {
      return NextResponse.json({ error: '缺少资源ID' }, { status: 400 })
    }

    await db.resource.delete({ where: { id: resourceId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete resource error:', error)
    return NextResponse.json({ error: '删除资源失败' }, { status: 500 })
  }
}
