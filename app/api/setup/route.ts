import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Check if setup is needed (no super_admin exists)
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('super_admin', true)
      .limit(1)

    if (error) {
      // Table might not exist yet
      return NextResponse.json({ needsSetup: true })
    }

    return NextResponse.json({ needsSetup: !data || data.length === 0 })
  } catch {
    return NextResponse.json({ needsSetup: true })
  }
}

// Create the first super admin
export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any

    // Block if super admin already exists
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('super_admin', true)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Setup already complete. A super admin already exists.' }, { status: 403 })
    }

    const { email, password, full_name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if auth user already exists
    const { data: { users } } = await admin.auth.admin.listUsers()
    const existingUser = users.find((u: { email: string }) => u.email === email)

    let userId: string

    if (existingUser) {
      // User exists in auth — just upsert their profile
      userId = existingUser.id
      const { error: upsertError } = await admin.from('profiles').upsert({
        id: userId,
        email,
        full_name: full_name || email.split('@')[0],
        super_admin: true,
        is_active: true,
      })
      if (upsertError) throw upsertError
    } else {
      // Create new auth user and profile
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split('@')[0], super_admin: true },
      })
      if (createError) throw createError
      userId = newUser.user.id

      // Update profile flags after the auth trigger creates a default profile row.
      await admin.from('profiles').update({
        super_admin: true,
        is_active: true,
        full_name: full_name || email.split('@')[0],
      }).eq('id', userId)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
