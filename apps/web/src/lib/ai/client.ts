import { askInventoryAssistant } from '@/actions/ai'
import type {
  AskInventoryAssistantInput,
  AskInventoryAssistantResult,
} from '@/lib/ai/contracts'
import { evaluateAiBudget, resolveAiEnvironment } from '@/lib/ai/cost-policy'
import { createClient } from '@/utils/supabase/server'

const EDGE_AI_FUNCTION_NAME = 'ai_assistant'

export async function askInventoryAssistantViaGateway(
  householdId: string,
  input: AskInventoryAssistantInput,
): Promise<AskInventoryAssistantResult> {
  if (process.env.AI_ENABLED === 'false') {
    return {
      success: false,
      error: 'AI is currently disabled.',
      errorCode: 'disabled',
    }
  }

  const budgetCheck = evaluateAiBudget({
    environment: resolveAiEnvironment(),
    estimatedRequestUsd: Number(process.env.AI_ESTIMATED_REQUEST_USD ?? '0.001'),
    projectedMonthlyUsd: Number(process.env.AI_PROJECTED_MONTHLY_USD ?? '0'),
  })
  if (!budgetCheck.allowed) {
    return {
      success: false,
      error: 'AI budget threshold reached for this environment.',
      errorCode: 'budget_exceeded',
    }
  }

  const supabase = await createClient()
  const { data: sessionResult } = await supabase.auth.getSession()
  const accessToken = sessionResult.session?.access_token ?? null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return askInventoryAssistant(householdId, input)
  }

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
        question: input.question,
      }),
    })

    const data = (await response.json()) as AskInventoryAssistantResult
    if (!response.ok) {
      throw new Error(`edge_function_http_${response.status}`)
    }

    console.log(
      JSON.stringify({
        event: 'ai_gateway_invoke',
        timestamp: new Date().toISOString(),
        outcome: data.success ? 'success' : 'failure',
        household_id: householdId,
        error_code: data.success ? null : data.errorCode,
      }),
    )
    return data
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'ai_gateway_fallback',
        timestamp: new Date().toISOString(),
        household_id: householdId,
        reason: error instanceof Error ? error.message : 'unknown_error',
      }),
    )
    return askInventoryAssistant(householdId, input)
  }
}
