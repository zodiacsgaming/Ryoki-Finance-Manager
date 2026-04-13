import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Helper to verify caller is super_admin
async function verifySuperAdmin() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'super_admin') return null
  return session
}

// GET /api/admin/users — list all users
export async function GET() {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(profiles)
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, password, full_name, role = 'user' } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Create the auth user
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Update profile role if not default user
  if (role !== 'user' && newUser.user) {
    await admin.from('profiles').update({ role, full_name }).eq('id', newUser.user.id)
  } else if (full_name && newUser.user) {
    await admin.from('profiles').update({ full_name }).eq('id', newUser.user.id)
  }

  return NextResponse.json({ success: true, userId: newUser.user?.id })
}
