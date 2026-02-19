import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const USER_ID_HEADER = 'x-oi-user-id'
const USER_EMAIL_HEADER = 'x-oi-user-email'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/settings')

  // Defensive: if matcher ever expands, avoid auth calls on public routes.
  if (!isProtectedRoute) {
    return NextResponse.next({ request })
  }

  const requestHeaders = new Headers(request.headers)

  // Track cookie updates so we can safely construct a final response after we
  // know whether the user is authenticated and what headers we want to inject.
  const cookiesToSetAccumulator: Array<{
    name: string
    value: string
    options: Parameters<NextResponse['cookies']['set']>[2]
  }> = []

  const buildNextResponse = () =>
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

  let supabaseResponse = buildNextResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          supabaseResponse = buildNextResponse()

          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetAccumulator.push({ name, value, options })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid putting logic between createServerClient and getClaims.
  // getClaims validates JWT signature/expiry without calling the Auth server.
  const { data, error } = await supabase.auth.getClaims()
  const claims = (data?.claims ?? null) as null | Record<string, unknown>
  const role = typeof claims?.role === 'string' ? claims.role : null
  const aud = typeof claims?.aud === 'string' ? claims.aud : null
  const hasUserEmail = typeof claims?.email === 'string' && claims.email.includes('@')
  const isAuthenticated = (role === 'authenticated' || aud === 'authenticated') && hasUserEmail
  const userId = isAuthenticated && typeof claims?.sub === 'string' ? claims.sub : null
  const userEmail = isAuthenticated && typeof claims?.email === 'string' ? claims.email : ''

  if (process.env.NODE_ENV !== 'production' && process.env.VITEST !== 'true') {
    const isPrefetch =
      request.headers.get('next-router-prefetch') === '1' ||
      request.headers.get('purpose') === 'prefetch' ||
      request.headers.get('sec-purpose') === 'prefetch'

    console.info('[middleware.auth]', {
      pathname,
      isPrefetch,
      accept: request.headers.get('accept'),
      user: userId ? 'present' : 'missing',
      errorCode: error?.code ?? null,
    })
  }

  if (!userId || error) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const redirectResponse = NextResponse.redirect(loginUrl)
    cookiesToSetAccumulator.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options)
    )
    return redirectResponse
  }

  // UI convenience only. Do not use these headers as an authz boundary.
  requestHeaders.set(USER_ID_HEADER, userId)
  requestHeaders.set(USER_EMAIL_HEADER, userEmail)

  const finalResponse = buildNextResponse()
  cookiesToSetAccumulator.forEach(({ name, value, options }) =>
    finalResponse.cookies.set(name, value, options)
  )

  return finalResponse
}
