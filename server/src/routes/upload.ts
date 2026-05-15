import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { uid } from '../db.js'

const PROJECT_ROOT = path.resolve(path.join(process.cwd(), '..'))
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'png'
    const id = uid()
    cb(null, id + '.' + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})

const router = Router()

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '未找到上传文件' })
    return
  }

  const file = req.file
  const fileUrl = '/uploads/' + file.filename
  const ext = file.filename.split('.').pop() || 'png'

  res.json({
    url: fileUrl,
    originalUrl: fileUrl,
    size: file.size,
    name: file.originalname,
    mimeType: file.mimetype,
    format: ext,
    originalName: file.originalname,
  })
})

export default router
