import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

async function verifySuperAdmin() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single() as { data: { role: string } | null }
  if (profile?.role !== 'super_admin') return null
  return session
}

// PATCH /api/admin/users/[id] — update user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { full_name, role, is_active, password } = body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Update profile fields
  const profileUpdate: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdate.full_name = full_name
  if (role !== undefined) profileUpdate.role = role
  if (is_active !== undefined) profileUpdate.is_active = is_active

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdate).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reset password if provided
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(params.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users/[id] — delete user
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-deletion
  if (session.user.id === params.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
