import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function PATCH(req: NextRequest) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { full_name } = await req.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ full_name: full_name?.trim() || null })
    .eq('id', session.user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
