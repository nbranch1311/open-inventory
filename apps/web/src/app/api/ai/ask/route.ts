import { askInventoryAssistantViaGateway } from '@/lib/ai/client'
import { mapAssistantErrorToHttpStatus, type AskInventoryApiRequest } from '@/lib/ai/contracts'
import { getServerAuthContext } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > 10_000) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'User not authenticated',
        errorCode: 'unauthenticated',
      },
      { status: 401 },
    )
  }

  let body: Partial<AskInventoryApiRequest>

  try {
    body = (await request.json()) as Partial<AskInventoryApiRequest>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', errorCode: 'invalid_input' },
      { status: 400 },
    )
  }

  const householdId = body.householdId?.trim() ?? ''
  const question = body.question?.trim() ?? ''

  if (!householdId || !question) {
    return NextResponse.json(
      { success: false, error: 'householdId and question are required', errorCode: 'invalid_input' },
      { status: 400 },
    )
  }

  if (!UUID_PATTERN.test(householdId)) {
    return NextResponse.json(
      { success: false, error: 'householdId must be a UUID', errorCode: 'invalid_input' },
      { status: 400 },
    )
  }

  // Route-level authz so we can return deterministic 403s without hitting downstream services.
  const { data: memberships, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (membershipError || (memberships ?? []).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Access denied for inventory space',
        errorCode: 'forbidden_household',
      },
      { status: 403 },
    )
  }

  const result = await askInventoryAssistantViaGateway(householdId, { question })

  if (!result.success) {
    return NextResponse.json(result, { status: mapAssistantErrorToHttpStatus(result.errorCode) })
  }

  return NextResponse.json(result, { status: 200 })
}
