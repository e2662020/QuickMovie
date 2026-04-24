import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export interface AuthPayload {
  userId: string
  email: string
  name: string
  avatar?: string
}

export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  await db.userSession.create({
    data: {
      userId,
      token,
      createdAt: new Date(),
    },
  })

  return token
}

export async function getSession(token: string): Promise<AuthPayload | null> {
  const session = await db.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatar: session.user.avatar ?? undefined,
  }
}

export async function deleteSession(token: string): Promise<void> {
  await db.userSession.deleteMany({ where: { token } })
}

export async function getUserFromRequest(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return getSession(token)
}
