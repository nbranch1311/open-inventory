import { afterEach, describe, expect, it, vi } from 'vitest'
import { evaluateAiBudget, resolveAiBudgetPolicy, resolveAiEnvironment } from './cost-policy'

describe('cost-policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('resolves development environment by default', () => {
    expect(resolveAiEnvironment()).toBe('development')
  })

  it('resolves environment from AI_ENVIRONMENT override', () => {
    vi.stubEnv('AI_ENVIRONMENT', 'staging')
    expect(resolveAiEnvironment()).toBe('staging')
  })

  it('uses environment-specific budget caps from env vars', () => {
    vi.stubEnv('AI_BUDGET_CAP_STAGING_USD', '123')
    vi.stubEnv('AI_BUDGET_MODE_STAGING', 'block')

    const policy = resolveAiBudgetPolicy('staging')
    expect(policy.monthlyUsdCap).toBe(123)
    expect(policy.modeOnCapReached).toBe('block')
  })

  it('blocks when projected spend exceeds cap in block mode', () => {
    vi.stubEnv('AI_BUDGET_CAP_PROD_USD', '10')
    vi.stubEnv('AI_BUDGET_MODE_PROD', 'block')

    const result = evaluateAiBudget({
      environment: 'production',
      estimatedRequestUsd: 2,
      projectedMonthlyUsd: 9,
    })

    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toBe('budget_exceeded')
    }
  })

  it('allows when over cap in degrade mode', () => {
    vi.stubEnv('AI_BUDGET_CAP_DEV_USD', '1')
    vi.stubEnv('AI_BUDGET_MODE_DEV', 'degrade')

    const result = evaluateAiBudget({
      environment: 'development',
      estimatedRequestUsd: 2,
      projectedMonthlyUsd: 0,
    })

    expect(result.allowed).toBe(true)
  })
})
