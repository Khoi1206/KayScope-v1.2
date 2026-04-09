import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createUserRepository } from '@/lib/db/repository-factory'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { mutationLimiter } from '@/lib/api/shared-limiters'
import { getClientIp } from '@/lib/api/http-utils'

/** GET /api/user/profile — return fresh profile from DB */
export async function GET() {
  const session = await requireSession()
  const userId = session.user.id
  if (!userId) return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 })
  const repo = createUserRepository()
  const user = await repo.findById(userId)
  if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      createdAt: user.createdAt,
    },
  })
}

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

/** PATCH /api/user/profile — update name and/or password */
export async function PATCH(request: NextRequest) {
  const session = await requireSession()
  if (!await mutationLimiter.check(getClientIp(request))) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 })
  }
  const userId = session.user.id
  if (!userId) return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 })

  const raw = await request.json()
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, currentPassword, newPassword } = parsed.data

  const repo = createUserRepository()
  const user = await repo.findById(userId)
  if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

  // Password change — only allowed for credentials provider
  if (newPassword) {
    if (user.provider !== 'credentials') {
      return NextResponse.json(
        { success: false, message: 'Password change is not available for social accounts' },
        { status: 403 }
      )
    }
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is required' },
        { status: 400 }
      )
    }
    const valid = await bcrypt.compare(currentPassword, user.password ?? '')
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      )
    }
    const hashed = await bcrypt.hash(newPassword, 12)
    const updateData: Parameters<typeof repo.update>[1] = { password: hashed }
    if (name) updateData.name = name.trim()
    await repo.update(userId, updateData)
    return NextResponse.json({ success: true, message: 'Profile updated' })
  }

  if (!name) {
    return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 })
  }
  await repo.update(userId, { name: name.trim() })
  return NextResponse.json({ success: true, message: 'Profile updated' })
}
