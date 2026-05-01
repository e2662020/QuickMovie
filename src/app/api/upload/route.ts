import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_FILE_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserFromRequest()
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const resource = formData.get('resource') === 'true'

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    const maxSize = resource ? MAX_FILE_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      const limitMb = Math.round(maxSize / 1024 / 1024)
      return NextResponse.json({ error: `文件大小不能超过 ${limitMb}MB` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const baseFilename = randomUUID()
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    if (!resource && IMAGE_TYPES.includes(file.type) && file.type !== 'image/svg+xml' && file.type !== 'image/webp') {
      try {
        const sharp = (await import('sharp')).default
        const webpFilename = `${baseFilename}.webp`
        await sharp(buffer)
          .webp({ quality: 85 })
          .toFile(path.join(uploadDir, webpFilename))

        const origExt = file.type === 'image/png' ? 'png' : 'jpg'
        const origFilename = `${baseFilename}_orig.${origExt}`
        await writeFile(path.join(uploadDir, origFilename), buffer)

        return NextResponse.json({
          url: `/uploads/${webpFilename}`,
          originalUrl: `/uploads/${origFilename}`,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          format: 'webp',
        })
      } catch {
        const origFilename = `${baseFilename}.${ext}`
        await writeFile(path.join(uploadDir, origFilename), buffer)
        return NextResponse.json({ url: `/uploads/${origFilename}` })
      }
    }

    if (file.type === 'image/svg+xml') {
      const svgFilename = `${baseFilename}.svg`
      await writeFile(path.join(uploadDir, svgFilename), buffer)
      return NextResponse.json({ url: `/uploads/${svgFilename}` })
    }

    if (file.type === 'image/webp') {
      const webpFilename = `${baseFilename}.webp`
      await writeFile(path.join(uploadDir, webpFilename), buffer)
      return NextResponse.json({ url: `/uploads/${webpFilename}` })
    }

    const origFilename = `${baseFilename}.${ext}`
    await writeFile(path.join(uploadDir, origFilename), buffer)

    return NextResponse.json({
      url: `/uploads/${origFilename}`,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
