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

type ProductForAssistant = {
  id: string
  household_id: string
  sku: string | null
  barcode: string | null
  name: string
  unit: string | null
  is_active: boolean
}

type StockOnHandRow = {
  household_id: string | null
  product_id: string | null
  room_id: string | null
  quantity_on_hand: number | null
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
const BUSINESS_STOCK_INTENT_PATTERN =
  /\b(on hand|stock|units|qty|quantity|how many|available)\b/i
const BUSINESS_LOW_STOCK_INTENT_PATTERN = /\b(low stock|restock|reorder)\b/i

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

function toProductCitation(product: ProductForAssistant, quantityOnHand: number): AssistantCitation {
  return {
    itemId: product.id,
    itemName: product.name,
    quantity: quantityOnHand,
    unit: product.unit,
    roomId: null,
    expiryDate: null,
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

async function getHouseholdWorkspaceType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
): Promise<'personal' | 'business'> {
  const { data, error } = await supabase
    .from('households')
    .select('workspace_type')
    .eq('id', householdId)
    .single()

  if (error || !data?.workspace_type) {
    return 'personal'
  }

  return data.workspace_type === 'business' ? 'business' : 'personal'
}

async function getHouseholdProductsWithStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string,
) {
  const [productsResult, stockResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, household_id, sku, barcode, name, unit, is_active')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('stock_on_hand')
      .select('household_id, product_id, room_id, quantity_on_hand')
      .eq('household_id', householdId),
  ])

  if (productsResult.error || stockResult.error) {
    return {
      error: true as const,
      products: [] as Array<{ product: ProductForAssistant; onHand: number }>,
    }
  }

  const stockRows = (stockResult.data ?? []) as StockOnHandRow[]
  const stockByProductId = new Map<string, number>()
  stockRows.forEach((row) => {
    if (!row.product_id) return
    const previous = stockByProductId.get(row.product_id) ?? 0
    stockByProductId.set(row.product_id, previous + Number(row.quantity_on_hand ?? 0))
  })

  const products = (productsResult.data ?? []) as ProductForAssistant[]
  return {
    error: false as const,
    products: products.map((product) => ({
      product,
      onHand: stockByProductId.get(product.id) ?? 0,
    })),
  }
}

function answerBusinessLowStock(
  products: Array<{ product: ProductForAssistant; onHand: number }>,
): AskInventoryAssistantSuccess {
  const low = products
    .filter((entry) => entry.onHand <= 5)
    .sort((a, b) => a.onHand - b.onHand)
    .slice(0, 5)

  if (low.length === 0) {
    return {
      success: true,
      confidence: 'medium',
      answer: 'I did not find any products at or below the low-stock threshold (5 units).',
      citations: [],
      suggestions: [],
      clarifyingQuestion: 'Do you want a different threshold?',
    }
  }

  const citations = low.map((entry) => toProductCitation(entry.product, entry.onHand))
  const suggestions: AssistantSuggestion[] = low.map((entry) => ({
    type: 'restock',
    itemId: entry.product.id,
    reason: 'Low stock (5 units or less).',
  }))

  const label = citations.map((c) => `${c.itemName} (${c.quantity})`).join(', ')
  return {
    success: true,
    confidence: 'high',
    answer: `Low stock products: ${label}. Evidence: ${citations.map((c) => c.itemName).join(', ')}.`,
    citations,
    suggestions,
    clarifyingQuestion: null,
  }
}

function answerBusinessAvailability(
  products: Array<{ product: ProductForAssistant; onHand: number }>,
  question: string,
): AskInventoryAssistantSuccess {
  const keywords = extractKeywords(question)
  const matches = products.filter((entry) => {
    const haystack = `${entry.product.name} ${entry.product.sku ?? ''} ${entry.product.barcode ?? ''}`.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword))
  })

  if (matches.length === 0) {
    return {
      success: true,
      confidence: 'low',
      answer: "I couldn't find a grounded match for that product in your catalog.",
      citations: [],
      suggestions: [],
      clarifyingQuestion: 'Can you share the product name or SKU?',
    }
  }

  const top = matches.slice(0, 3)
  const citations = top.map((entry) => toProductCitation(entry.product, entry.onHand))
  const label = citations.map((c) => `${c.itemName}: ${c.quantity} ${c.unit ?? ''}`.trim()).join(', ')

  return {
    success: true,
    confidence: 'high',
    answer: `On hand: ${label}. Evidence: ${citations.map((c) => c.itemName).join(', ')}.`,
    citations,
    suggestions: citations
      .filter((c) => c.quantity <= 5)
      .map((c) => ({ type: 'restock', itemId: c.itemId, reason: 'Low stock (5 units or less).' })),
    clarifyingQuestion: null,
  }
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

  const workspaceType = await getHouseholdWorkspaceType(supabase, householdId)
  if (workspaceType === 'business') {
    const productResult = await getHouseholdProductsWithStock(supabase, householdId)
    if (productResult.error) {
      return {
        success: false,
        error: 'Failed to fetch inventory context',
        errorCode: 'fetch_failed',
      }
    }

    if (productResult.products.length === 0) {
      return {
        success: true,
        confidence: 'low',
        answer:
          "I don't have product or movement data to answer that yet. Add a product (or import CSV) and I can give a grounded answer.",
        citations: [],
        suggestions: [],
        clarifyingQuestion: 'Which product do you want to track first?',
      }
    }

    if (BUSINESS_LOW_STOCK_INTENT_PATTERN.test(normalizedQuestion)) {
      return answerBusinessLowStock(productResult.products)
    }

    if (BUSINESS_STOCK_INTENT_PATTERN.test(normalizedQuestion) || normalizedQuestion.length > 0) {
      return answerBusinessAvailability(productResult.products, normalizedQuestion)
    }
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
