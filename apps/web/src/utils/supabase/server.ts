import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

type AuthClaims = Record<string, unknown> & {
  sub?: string
  email?: string
}

/**
 * Server-side auth context for a single Next.js request/render.
 *
 * - Uses `getClaims()` to avoid hitting Supabase Auth rate limits.
 * - Memoized so multiple server actions/components in the same request
 *   don't re-run auth parsing/validation.
 */
export const getServerAuthContext = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  const claims = (data?.claims ?? null) as AuthClaims | null
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  const email = typeof claims?.email === 'string' ? claims.email : null

  return { supabase, userId, email, error }
})
