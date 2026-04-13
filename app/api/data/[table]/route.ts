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

const ORDER_MAP: Record<TableName, string> = {
  assets: 'date_added',
  savings: 'date',
  emergency_funds: 'date',
  expenses: 'date',
  cash_on_hand: 'date',
}

async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function GET(_req: NextRequest, { params }: { params: { table: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tableName = TABLE_MAP[params.table]
  if (!tableName) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(tableName)
    .select('*')
    .eq('user_id', session.user.id)
    .order(ORDER_MAP[tableName], { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { table: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tableName = TABLE_MAP[params.table]
  if (!tableName) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from(tableName)
    .insert({ ...body, user_id: session.user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
