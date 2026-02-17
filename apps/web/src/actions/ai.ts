'use server'

import { getServerAuthContext } from '@/utils/supabase/server'
import type {
  AskInventoryAssistantInput,
  AskInventoryAssistantResult,
  AskInventoryAssistantSuccess,
  AssistantCitation,
  AssistantSuggestion,
} from '@/lib/ai/contracts'

type InventoryItemForAssistant = {
  id: string
  household_id: string
  room_id: string | null
  name: string
  description: string | null
  quantity: number
  unit: string | null
  expiry_date: string | null
}

export const INVENTORY_ASSISTANT_PROMPT_CONTRACT = `
You are OpenInventory Assistant. Follow these non-negotiable rules:
1) Ground every factual claim in provided household inventory data.
2) If evidence is missing, explicitly state uncertainty and ask a clarifying question.
3) Refuse destructive or purchasing actions.
4) Never infer cross-household data.
5) Suggestions are non-destructive and require user confirmation.
`.trim()

const DESTRUCTIVE_OR_PURCHASING_PATTERN =
  /\b(delete|remove|destroy|wipe|buy|purchase|order|checkout|reorder)\b/i
const CROSS_HOUSEHOLD_PATTERN = /\b(other household|another household|someone else|other user)\b/i
const EXPIRY_INTENT_PATTERN = /\b(expire|expiry|expiring|soon|spoil)\b/i
const OVERVIEW_INTENT_PATTERN = /\b(what do i have|show inventory|list items|what's in)\b/i

const KEYWORD_STOPWORDS = new Set([
  'do',
  'i',
  'have',
  'any',
  'the',
  'a',
  'an',
  'what',
  'is',
  'are',
  'my',
  'in',
  'on',
  'for',
  'to',
  'of',
  'with',
  'please',
  'you',
  'me',
  'show',
  'list',
  'tell',
  'about',
  'soon',
  'expires',
  'expiring',
])

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function toCitation(item: InventoryItemForAssistant): AssistantCitation {
  return {
    itemId: item.id,
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    roomId: item.room_id,
    expiryDate: item.expiry_date,
  }
}

function extractKeywords(question: string): string[] {
  return normalizeText(question)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !KEYWORD_STOPWORDS.has(token))
}

function findKeywordMatches(items: InventoryItemForAssistant[], keywords: string[]) {
  if (keywords.length === 0) {
    return []
  }

  return items.filter((item) => {
    const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword))
  })
}

function getExpiringItems(items: InventoryItemForAssistant[]) {
  const now = Date.now()
  return items
    .filter((item) => item.expiry_date)
    .map((item) => ({
      item,
      daysUntilExpiry: Math.ceil((new Date(item.expiry_date as string).getTime() - now) / (1000 * 60 * 60 * 24)),
    }))
    .filter((entry) => Number.isFinite(entry.daysUntilExpiry))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
}

function buildRefusalResult(): AskInventoryAssistantSuccess {
  return {
    success: true,
    confidence: 'refuse',
    answer:
      'I can help with grounded inventory questions and suggestions, but I cannot perform destructive or purchasing actions.',
    citations: [],
    suggestions: [],
    clarifyingQuestion: null,
  }
}

function buildNoItemsResult(): AskInventoryAssistantSuccess {
  return {
    success: true,
    confidence: 'low',
    answer:
      "I don't have inventory data to answer that yet because this space has no items. Add an item and I can give a grounded answer.",
    citations: [],
    suggestions: [],
    clarifyingQuestion: 'Which item do you want to track first?',
  }
}

function buildNoMatchResult(): AskInventoryAssistantSuccess {
  return {
    success: true,
    confidence: 'low',
    answer:
      "I couldn't find a grounded match for that question in your current inventory data.",
    citations: [],
    suggestions: [],
    clarifyingQuestion: 'Can you share the exact item name or an alternative keyword?',
  }
}

async function userCanAccessHousehold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  householdId: string,
) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .limit(1)

  if (error) {
    return false
  }

  return (data ?? []).length > 0
}

async function getHouseholdItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, household_id, room_id, name, description, quantity, unit, expiry_date')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: true as const, items: [] as InventoryItemForAssistant[] }
  }

  return { error: false as const, items: (data ?? []) as InventoryItemForAssistant[] }
}

function answerExpiringSoon(items: InventoryItemForAssistant[]): AskInventoryAssistantSuccess {
  const expiringEntries = getExpiringItems(items)
  const expiringSoon = expiringEntries.filter((entry) => entry.daysUntilExpiry <= 30).slice(0, 5)

  if (expiringSoon.length === 0) {
    return {
      success: true,
      confidence: 'medium',
      answer: 'I did not find items expiring in the next 30 days.',
      citations: [],
      suggestions: [],
      clarifyingQuestion: 'Do you want all items with any expiration date instead?',
    }
  }

  const suggestions: AssistantSuggestion[] = expiringSoon
    .filter((entry) => entry.daysUntilExpiry <= 7)
    .map((entry) => ({
      type: 'reminder',
      itemId: entry.item.id,
      reason: 'Item expires within 7 days.',
    }))

  const citations = expiringSoon.map((entry) => toCitation(entry.item))
  const evidenceLabel = citations.map((citation) => citation.itemName).join(', ')
  return {
    success: true,
    confidence: 'high',
    answer: `I found ${citations.length} item(s) expiring soon. Evidence: ${evidenceLabel}.`,
    citations,
    suggestions,
    clarifyingQuestion: null,
  }
}

function answerInventoryOverview(items: InventoryItemForAssistant[]): AskInventoryAssistantSuccess {
  const topItems = items.slice(0, 5).map(toCitation)
  const evidenceLabel = topItems.map((citation) => citation.itemName).join(', ')
  return {
    success: true,
    confidence: 'medium',
    answer: `You currently have ${items.length} item(s) in this inventory space. Evidence: ${evidenceLabel}.`,
    citations: topItems,
    suggestions: [],
    clarifyingQuestion: null,
  }
}

function answerAvailability(
  items: InventoryItemForAssistant[],
  normalizedQuestion: string,
): AskInventoryAssistantSuccess {
  const keywords = extractKeywords(normalizedQuestion)
  const matches = findKeywordMatches(items, keywords).slice(0, 5)

  if (matches.length === 0) {
    return buildNoMatchResult()
  }

  const citations = matches.map(toCitation)
  const quantitySummary = citations
    .map((citation) => `${citation.itemName} (${citation.quantity} ${citation.unit ?? 'units'})`)
    .join(', ')

  const restockSuggestions: AssistantSuggestion[] = citations
    .filter((citation) => citation.quantity <= 1)
    .map((citation) => ({
      type: 'restock',
      itemId: citation.itemId,
      reason: 'Quantity is low (1 or less).',
    }))

  return {
    success: true,
    confidence: 'high',
    answer: `Yes, I found ${citations.length} matching item(s): ${quantitySummary}. Evidence: ${citations
      .map((citation) => citation.itemName)
      .join(', ')}.`,
    citations,
    suggestions: restockSuggestions,
    clarifyingQuestion: null,
  }
}

export async function askInventoryAssistant(
  householdId: string,
  input: AskInventoryAssistantInput,
): Promise<AskInventoryAssistantResult> {
  const question = input.question?.trim() ?? ''
  if (!question) {
    return {
      success: false,
      error: 'Question is required',
      errorCode: 'invalid_input',
    }
  }

  const { supabase, userId } = await getServerAuthContext()
  if (!userId) {
    return {
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    }
  }

  const hasAccess = await userCanAccessHousehold(supabase, userId, householdId)
  if (!hasAccess) {
    return {
      success: false,
      error: 'Access denied for inventory space',
      errorCode: 'forbidden_household',
    }
  }

  const normalizedQuestion = normalizeText(question)
  if (
    DESTRUCTIVE_OR_PURCHASING_PATTERN.test(normalizedQuestion) ||
    CROSS_HOUSEHOLD_PATTERN.test(normalizedQuestion)
  ) {
    return buildRefusalResult()
  }

  const itemsResult = await getHouseholdItems(supabase, householdId)
  if (itemsResult.error) {
    return {
      success: false,
      error: 'Failed to fetch inventory context',
      errorCode: 'fetch_failed',
    }
  }

  if (itemsResult.items.length === 0) {
    return buildNoItemsResult()
  }

  if (EXPIRY_INTENT_PATTERN.test(normalizedQuestion)) {
    return answerExpiringSoon(itemsResult.items)
  }

  if (OVERVIEW_INTENT_PATTERN.test(normalizedQuestion)) {
    return answerInventoryOverview(itemsResult.items)
  }

  return answerAvailability(itemsResult.items, normalizedQuestion)
}
