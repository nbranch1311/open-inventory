import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCreateServerClient, mockGetUser } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

import { updateSession } from './middleware'

const BASE_URL = 'https://openinventory.test'

function buildRequest(pathname: string) {
  return new NextRequest(new URL(pathname, BASE_URL))
}

describe('updateSession', () => {
  it('redirects unauthenticated /dashboard requests to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    const response = await updateSession(buildRequest('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('redirects unauthenticated /onboarding requests to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    const response = await updateSession(buildRequest('/onboarding'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('redirects unauthenticated /settings requests to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    const response = await updateSession(buildRequest('/settings/inventory-space'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('does not redirect unprotected routes when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    const response = await updateSession(buildRequest('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('does not redirect protected routes when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })

    const response = await updateSession(buildRequest('/dashboard'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
