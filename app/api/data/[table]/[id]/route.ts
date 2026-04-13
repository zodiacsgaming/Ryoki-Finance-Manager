import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

type TableName = 'assets' | 'savings' | 'emergency_funds' | 'expenses' | 'cash_on_hand'

const TABLE_MAP: Record<string, TableName> = {
  assets: 'assets',
  savings: 'savings',
  'emergency-funds': 'emergency_funds',
  expenses: 'expenses',
  'cash-on-hand': 'cash_on_hand',
}

async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: { table: string; id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tableName = TABLE_MAP[params.table]
  if (!tableName) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin
    .from(tableName)
    .update(body)
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { table: string; id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tableName = TABLE_MAP[params.table]
  if (!tableName) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin
    .from(tableName)
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
