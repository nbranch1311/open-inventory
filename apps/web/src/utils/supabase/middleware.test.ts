import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCreateServerClient, mockGetClaims } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockGetClaims: vi.fn(),
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
  beforeEach(() => {
    mockCreateServerClient.mockReset()
    mockGetClaims.mockReset()
  })

  it('redirects unauthenticated /dashboard requests to /login', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null }, error: null })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    })

    const response = await updateSession(buildRequest('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('redirects unauthenticated /onboarding requests to /login', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null }, error: null })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    })

    const response = await updateSession(buildRequest('/onboarding'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('redirects unauthenticated /settings requests to /login', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null }, error: null })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    })

    const response = await updateSession(buildRequest('/settings/inventory-space'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${BASE_URL}/login`)
  })

  it('does not redirect unprotected routes when unauthenticated', async () => {
    const response = await updateSession(buildRequest('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('does not call Supabase auth for unprotected routes', async () => {
    const response = await updateSession(buildRequest('/login'))

    expect(response.status).toBe(200)
    expect(mockCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetClaims).not.toHaveBeenCalled()
  })

  it('does not redirect protected routes when authenticated', async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    })

    const response = await updateSession(buildRequest('/dashboard'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
