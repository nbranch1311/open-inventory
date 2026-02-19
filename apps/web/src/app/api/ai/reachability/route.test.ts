import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
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

import { GET } from './route'

describe('GET /api/ai/reachability', () => {
  const householdId = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          answer: 'ok',
          confidence: 'low',
          citations: [],
          suggestions: [],
          clarifyingQuestion: null,
        }),
      })),
    )
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'access-token-1' } },
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

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null },
        })),
        getSession: vi.fn(async () => ({
          data: { session: null },
        })),
      },
      from: vi.fn(),
    })

    const response = await GET(new Request(`http://localhost/api/ai/reachability?householdId=${householdId}`))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ reachable: false, errorCode: 'unauthenticated' })
  })

  it('returns 400 when householdId is missing', async () => {
    const response = await GET(new Request('http://localhost/api/ai/reachability'))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ reachable: false, errorCode: 'invalid_input' })
  })

  it('returns 403 when user is not a member of the household', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'access-token-1' } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })

    const response = await GET(new Request(`http://localhost/api/ai/reachability?householdId=${householdId}`))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ reachable: false, errorCode: 'forbidden_household' })
  })

  it('returns reachable:true when Edge Function invoke succeeds', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'access-token-1' } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [{ household_id: householdId }], error: null })),
            })),
          })),
        })),
      })),
    })

    const response = await GET(new Request(`http://localhost/api/ai/reachability?householdId=${householdId}`))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      reachable: true,
      edgeFunction: 'ai_assistant',
    })
  })

  it('returns 503 when Edge Function returns provider failure payload', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'access-token-1' } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [{ household_id: householdId }], error: null })),
            })),
          })),
        })),
      })),
    })
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Gemini provider is unavailable',
        errorCode: 'provider_unavailable',
      }),
    })

    const response = await GET(new Request(`http://localhost/api/ai/reachability?householdId=${householdId}`))
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      reachable: false,
      errorCode: 'provider_unavailable',
    })
  })

  it('returns 503 when Edge Function invoke fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'access-token-1' } },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [{ household_id: householdId }], error: null })),
            })),
          })),
        })),
      })),
    })
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Function not found'))

    const response = await GET(new Request(`http://localhost/api/ai/reachability?householdId=${householdId}`))
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ reachable: false, errorCode: 'invoke_failed' })
  })
})

