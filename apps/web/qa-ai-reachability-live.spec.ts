import { expect, test } from '@playwright/test'

test.describe('AI reachability (live)', () => {
  test.skip(!process.env.RUN_LIVE_AI, 'Set RUN_LIVE_AI=1 to run live reachability test')

  test('can reach Gemini via ai_assistant edge function', async ({ page }) => {
    const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
    const email = `qa-ai-live-${stamp}@gmail.com`
    const password = `QaPass!${stamp}`
    const inventorySpaceName = `QA Inventory Space ${stamp}`

    await page.goto('/signup')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/onboarding$/)
    await page.getByLabel('Inventory Space Name').fill(inventorySpaceName)
    await page.getByRole('button', { name: 'Create Inventory Space' }).click()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

    const householdId = await page.getByRole('combobox', { name: 'Select inventory space' }).inputValue()
    expect(householdId).toBeTruthy()

    const reachabilityResponse = await page.request.get(
      `/api/ai/reachability?householdId=${encodeURIComponent(householdId)}`,
    )
    const reachabilityStatus = reachabilityResponse.status()
    const reachabilityJson = (await reachabilityResponse.json()) as {
      reachable?: boolean
      errorCode?: string
      error?: string
      result?: unknown
    }
    if (reachabilityStatus !== 200) {
      throw new Error(
        `reachability_failed status=${reachabilityStatus} body=${JSON.stringify(reachabilityJson)}`,
      )
    }

    expect(reachabilityJson.reachable, 'reachable').toBe(true)
  })
})

