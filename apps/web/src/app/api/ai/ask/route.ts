import { askInventoryAssistantViaGateway } from '@/lib/ai/client'
import { mapAssistantErrorToHttpStatus, type AskInventoryApiRequest } from '@/lib/ai/contracts'
import { getServerAuthContext } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > 10_000) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const { userId } = await getServerAuthContext()
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const householdId = body.householdId?.trim() ?? ''
  const question = body.question?.trim() ?? ''

  if (!householdId || !question) {
    return NextResponse.json(
      { error: 'householdId and question are required' },
      { status: 400 },
    )
  }

  const result = await askInventoryAssistantViaGateway(householdId, { question })

  if (!result.success) {
    return NextResponse.json(result, { status: mapAssistantErrorToHttpStatus(result.errorCode) })
  }

  return NextResponse.json(result, { status: 200 })
}
