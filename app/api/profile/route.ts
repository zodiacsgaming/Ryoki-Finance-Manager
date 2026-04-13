import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Profile doesn't exist yet — create it now
  if (!data) {
    const { data: created, error: createError } = await admin
      .from('profiles')
      .insert({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name ?? null,
        super_admin: Boolean(session.user.user_metadata?.super_admin),
        is_active: true,
      })
      .select()
      .single()

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name } = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { error } = await admin
    .from('profiles')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      full_name: full_name?.trim() || null,
    }, { onConflict: 'id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
