export type AssistantConfidence = 'high' | 'medium' | 'low' | 'refuse'

export type AssistantSuggestion = {
  type: 'reminder' | 'restock'
  itemId: string
  reason: string
}

export type AssistantCitation = {
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
