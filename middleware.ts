import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/setup']
const ADMIN_ROUTES = ['/admin']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Allow public routes through
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    // If already logged in, redirect to dashboard
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  }

  // All other routes require authentication
  if (!session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if user account is active
  const { data: profile } = await supabase
    .from('profiles')
    .select('super_admin, is_active')
    .eq('id', session.user.id)
    .single() as { data: { super_admin: boolean; is_active: boolean } | null }

  if (profile && !profile.is_active) {
    await supabase.auth.signOut()
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('error', 'account_disabled')
    return NextResponse.redirect(loginUrl)
  }

  // Admin route protection
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!profile?.super_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - api/ routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
