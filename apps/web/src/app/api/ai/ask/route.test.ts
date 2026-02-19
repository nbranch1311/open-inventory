import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAskInventoryAssistantViaGateway } = vi.hoisted(() => ({
  mockAskInventoryAssistantViaGateway: vi.fn(),
}))
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/ai/client', () => ({
  askInventoryAssistantViaGateway: (...args: unknown[]) =>
    mockAskInventoryAssistantViaGateway(...args),
}))
vi.mock('@/utils/supabase/server', () => ({
  createClient: mockCreateClient,
  getServerAuthContext: async () => {
    const supabase = await mockCreateClient()
    const result = await supabase.auth.getUser()
    const user = result?.data?.user ?? null
    return { supabase, userId: user?.id ?? null, email: null, error: null }
  },
}))

import { POST } from './route'

describe('POST /api/ai/ask', () => {
  const householdId = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'user-1' },
          },
        })),
      },
      from: vi.fn((table: string) => {
        if (table !== 'household_members') {
          throw new Error(`Unexpected table: ${table}`)
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({
                  data: [{ household_id: householdId }],
                  error: null,
                })),
              })),
            })),
          })),
        }
      }),
    })
  })

  it('returns 400 for invalid JSON body', async () => {
    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: '{invalid-json',
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Invalid JSON body',
      errorCode: 'invalid_input',
    })
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId: '',
          question: '',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'householdId and question are required',
      errorCode: 'invalid_input',
    })
  })

  it('returns 401 when no authenticated user exists', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: null,
          },
        })),
      },
      from: vi.fn(),
    })

    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId,
          question: 'Do I have milk?',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'unauthenticated',
    })
    expect(mockAskInventoryAssistantViaGateway).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not a member of the household', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: 'user-1' },
          },
        })),
      },
      from: vi.fn((table: string) => {
        if (table !== 'household_members') {
          throw new Error(`Unexpected table: ${table}`)
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(async () => ({
                  data: [],
                  error: null,
                })),
              })),
            })),
          })),
        }
      }),
    })

    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId,
          question: 'Do I have milk?',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'forbidden_household',
    })
    expect(mockAskInventoryAssistantViaGateway).not.toHaveBeenCalled()
  })

  it('returns 200 with assistant response payload on success', async () => {
    mockAskInventoryAssistantViaGateway.mockResolvedValue({
      success: true,
      answer: 'You have milk.',
      confidence: 'high',
      citations: [],
      suggestions: [],
      clarifyingQuestion: null,
    })

    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId,
          question: 'Do I have milk?',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(mockAskInventoryAssistantViaGateway).toHaveBeenCalledWith(householdId, {
      question: 'Do I have milk?',
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      answer: 'You have milk.',
      confidence: 'high',
    })
  })

  it('maps unauthenticated assistant errors to 401', async () => {
    mockAskInventoryAssistantViaGateway.mockResolvedValue({
      success: false,
      error: 'User not authenticated',
      errorCode: 'unauthenticated',
    })

    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId,
          question: 'Do I have milk?',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'unauthenticated',
    })
  })

  it('maps budget exceeded errors to 429', async () => {
    mockAskInventoryAssistantViaGateway.mockResolvedValue({
      success: false,
      error: 'Budget exceeded',
      errorCode: 'budget_exceeded',
    })

    const response = await POST(
      new Request('http://localhost/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          householdId,
          question: 'Do I have milk?',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'budget_exceeded',
    })
  })
})
