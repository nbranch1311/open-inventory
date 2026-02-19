export type AssistantConfidence = 'high' | 'medium' | 'low' | 'refuse'

export type AssistantSuggestion = {
  type: 'reminder' | 'restock'
  itemId: string
  reason: string
}

export type AssistantCitation = {
  entityType: 'item' | 'product'
  itemId: string
  itemName: string
  quantity: number
  unit: string | null
  roomId: string | null
  expiryDate: string | null
}

export type AskInventoryAssistantSuccess = {
  success: true
  answer: string
  confidence: AssistantConfidence
  citations: AssistantCitation[]
  suggestions: AssistantSuggestion[]
  clarifyingQuestion: string | null
}

export type AskInventoryAssistantErrorCode =
  | 'invalid_input'
  | 'unauthenticated'
  | 'forbidden_household'
  | 'fetch_failed'
  | 'provider_unavailable'
  | 'budget_exceeded'
  | 'disabled'

export type AskInventoryAssistantFailure = {
  success: false
  error: string
  errorCode: AskInventoryAssistantErrorCode
}

export type AskInventoryAssistantResult =
  | AskInventoryAssistantSuccess
  | AskInventoryAssistantFailure

export type AskInventoryAssistantInput = {
  question: string
}

export type AskInventoryApiRequest = {
  householdId: string
  question: string
}

export type AskInventoryApiResponse = AskInventoryAssistantResult | { error: string }

// Keep this out of `'use server'` modules. Next.js enforces that server action files only export
// async functions, so any shared prompt/contracts must live in a normal module.
export const INVENTORY_ASSISTANT_PROMPT_CONTRACT = `
You are OpenInventory Assistant. Follow these non-negotiable rules:
1) Ground every factual claim in provided household inventory data.
2) If evidence is missing, explicitly state uncertainty and ask a clarifying question.
3) Refuse destructive or purchasing actions.
4) Never infer cross-household data.
5) Suggestions are non-destructive and require user confirmation.
`.trim()

export function mapAssistantErrorToHttpStatus(errorCode: AskInventoryAssistantErrorCode) {
  if (errorCode === 'invalid_input') return 400
  if (errorCode === 'unauthenticated') return 401
  if (errorCode === 'forbidden_household') return 403
  if (errorCode === 'budget_exceeded') return 429
  if (errorCode === 'disabled') return 503
  if (errorCode === 'provider_unavailable') return 503
  if (errorCode === 'fetch_failed') return 502
  return 500
}
