type AiEnvironment = 'development' | 'staging' | 'production'

type AiBudgetPolicy = {
  monthlyUsdCap: number
  modeOnCapReached: 'block' | 'degrade'
}

type AiCostContext = {
  environment: AiEnvironment
  estimatedRequestUsd: number
  projectedMonthlyUsd: number
}

type AiCostEvaluation =
  | {
      allowed: true
      policy: AiBudgetPolicy
    }
  | {
      allowed: false
      policy: AiBudgetPolicy
      reason: 'budget_exceeded'
    }

const DEFAULT_POLICY: Record<AiEnvironment, AiBudgetPolicy> = {
  development: {
    monthlyUsdCap: 25,
    modeOnCapReached: 'degrade',
  },
  staging: {
    monthlyUsdCap: 50,
    modeOnCapReached: 'degrade',
  },
  production: {
    monthlyUsdCap: 500,
    modeOnCapReached: 'block',
  },
}

function parseCap(raw: string | undefined, fallback: number) {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function parseMode(raw: string | undefined, fallback: 'block' | 'degrade') {
  return raw === 'block' || raw === 'degrade' ? raw : fallback
}

export function resolveAiEnvironment() {
  if (process.env.NODE_ENV === 'production') return 'production'
  if (process.env.AI_ENVIRONMENT === 'production') return 'production'
  if (process.env.AI_ENVIRONMENT === 'staging') return 'staging'
  return 'development'
}

export function resolveAiBudgetPolicy(environment: AiEnvironment): AiBudgetPolicy {
  const defaultPolicy = DEFAULT_POLICY[environment]

  if (environment === 'production') {
    return {
      monthlyUsdCap: parseCap(process.env.AI_BUDGET_CAP_PROD_USD, defaultPolicy.monthlyUsdCap),
      modeOnCapReached: parseMode(process.env.AI_BUDGET_MODE_PROD, defaultPolicy.modeOnCapReached),
    }
  }

  if (environment === 'staging') {
    return {
      monthlyUsdCap: parseCap(process.env.AI_BUDGET_CAP_STAGING_USD, defaultPolicy.monthlyUsdCap),
      modeOnCapReached: parseMode(process.env.AI_BUDGET_MODE_STAGING, defaultPolicy.modeOnCapReached),
    }
  }

  return {
    monthlyUsdCap: parseCap(process.env.AI_BUDGET_CAP_DEV_USD, defaultPolicy.monthlyUsdCap),
    modeOnCapReached: parseMode(process.env.AI_BUDGET_MODE_DEV, defaultPolicy.modeOnCapReached),
  }
}

export function evaluateAiBudget(context: AiCostContext): AiCostEvaluation {
  const policy = resolveAiBudgetPolicy(context.environment)
  const projectedWithRequest = context.projectedMonthlyUsd + Math.max(0, context.estimatedRequestUsd)

  if (projectedWithRequest > policy.monthlyUsdCap && policy.modeOnCapReached === 'block') {
    return {
      allowed: false,
      policy,
      reason: 'budget_exceeded',
    }
  }

  return {
    allowed: true,
    policy,
  }
}
