import { getServerAuthContext } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const EDGE_AI_FUNCTION_NAME = 'ai_assistant'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return NextResponse.json(
      {
        reachable: false,
        error: 'User not authenticated',
        errorCode: 'unauthenticated',
      },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const householdId = (url.searchParams.get('householdId') ?? '').trim()
  if (!householdId) {
    return NextResponse.json(
      { reachable: false, error: 'householdId is required', errorCode: 'invalid_input' },
      { status: 400 },
    )
  }

  if (!UUID_PATTERN.test(householdId)) {
    return NextResponse.json(
      { reachable: false, error: 'householdId must be a UUID', errorCode: 'invalid_input' },
      { status: 400 },
    )
  }

  // Route-level authz: verify membership before probing the Edge Function.
  const { data: memberships, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (membershipError || (memberships ?? []).length === 0) {
    return NextResponse.json(
      {
        reachable: false,
        error: 'Access denied for inventory space',
        errorCode: 'forbidden_household',
      },
      { status: 403 },
    )
  }

  const { data: sessionResult } = await supabase.auth.getSession()
  const accessToken = sessionResult.session?.access_token ?? null
  if (!accessToken) {
    return NextResponse.json(
      {
        reachable: false,
        error: 'User session token missing',
        errorCode: 'unauthenticated',
      },
      { status: 401 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { reachable: false, error: 'Supabase environment not configured', errorCode: 'fetch_failed' },
      { status: 500 },
    )
  }

  const startedAt = Date.now()
  let data: unknown = null
  let error: Error | null = null
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${EDGE_AI_FUNCTION_NAME}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        householdId,
        // Trigger a real provider call + tool grounding, but should be cheap.
        question: 'Do I have zzzzzzzzz?',
      }),
    })
    data = await response.json()
    if (!response.ok) {
      // If the Edge Function ran and returned a structured failure, preserve it.
      const payload = data as { success?: boolean; error?: string; errorCode?: string } | null
      if (payload && payload.success === false) {
        return NextResponse.json(
          {
            reachable: false,
            edgeFunction: EDGE_AI_FUNCTION_NAME,
            elapsedMs: Date.now() - startedAt,
            error: payload.error ?? 'AI call failed',
            errorCode: payload.errorCode ?? 'unknown_failure',
            result: data,
          },
          { status: 503 },
        )
      }

      throw new Error(`edge_function_http_${response.status}`)
    }
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error('invoke_failed')
  }
  const elapsedMs = Date.now() - startedAt

  if (error) {
    return NextResponse.json(
      {
        reachable: false,
        edgeFunction: EDGE_AI_FUNCTION_NAME,
        elapsedMs,
        error: error.message,
        errorCode: 'invoke_failed',
      },
      { status: 503 },
    )
  }

  // We consider "reachable" as: Edge function invoked AND provider returned a success payload.
  // If provider is missing/unavailable/disabled/budget-blocked, report unreachable.
  const payload = data as unknown as { success?: boolean; error?: string; errorCode?: string } | null
  if (payload && payload.success === false) {
    return NextResponse.json(
      {
        reachable: false,
        edgeFunction: EDGE_AI_FUNCTION_NAME,
        elapsedMs,
        error: payload.error ?? 'AI call failed',
        errorCode: payload.errorCode ?? 'unknown_failure',
        result: data,
      },
      { status: 503 },
    )
  }

  return NextResponse.json(
    {
      reachable: true,
      edgeFunction: EDGE_AI_FUNCTION_NAME,
      elapsedMs,
      result: data,
    },
    { status: 200 },
  )
}

