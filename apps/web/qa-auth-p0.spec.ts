import { expect, test } from '@playwright/test'

function buildQaUser() {
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  return {
    email: `qat0048${stamp}@gmail.com`,
    password: `QaPass!${stamp}`,
  }
}

test.describe('T-004.8-API P0 auth matrix', () => {
  test('strict unauth route assertions for /dashboard and /onboarding', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signup confirmation mode probe (OFF/ON)', async ({ page }) => {
    const user = buildQaUser()

    await page.goto('/signup')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/onboarding')) {
      await expect(page.getByRole('heading', { name: /welcome! let'?s get started/i })).toBeVisible()
      return
    }

    await expect(page).toHaveURL(/\/signup$/)
    const signupAlert = (await page.getByRole('alert').first().textContent())?.toLowerCase() ?? ''
    test.skip(signupAlert.includes('rate limit exceeded'), 'signup blocked by Supabase rate limit')
    await expect(page.getByText(/confirm your email/i)).toBeVisible()
  })

  test('login invalid credentials shows safe error and no redirect', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(`qa-invalid-${Date.now()}@gmail.com`)
    await page.getByLabel('Password').fill('NotTheRightPassword123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
  })

  test('full deterministic flow + login success/failure + session expiry simulation', async ({
    page,
    context,
  }) => {
    const qaUser = buildQaUser()

    await page.goto('/signup')
    await page.getByLabel('Email').fill(qaUser.email)
    await page.getByLabel('Password').fill(qaUser.password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/signup')) {
      const signupAlert = (await page.getByRole('alert').first().textContent())?.toLowerCase() ?? ''
      const isRateLimited = signupAlert.includes('rate limit exceeded')
      const needsEmailConfirmation = signupAlert.includes('confirm your email')
      test.skip(
        isRateLimited || needsEmailConfirmation,
        isRateLimited
          ? 'full flow blocked by Supabase signup rate limit'
          : 'requires signup confirmation OFF in active environment',
      )
    }
    await expect(page).toHaveURL(/\/onboarding$/)

    const householdName = `QA Household ${Date.now()}`
    await page.getByLabel('Household Name').fill(householdName)
    await page.getByRole('button', { name: 'Create Household' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1, name: /inventory/i })).toBeVisible()

    // Simulate session expiry by clearing auth cookies before revisiting protected routes.
    await page.goto('/dashboard/add')
    await expect(page).toHaveURL(/\/dashboard\/add$/)
    await context.clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
    await page.goBack()
    await expect(page.url()).not.toContain('/dashboard')
    await expect(page.url()).not.toContain('/onboarding')

    await page.goto('/login')
    await page.getByLabel('Email').fill(qaUser.email)
    await page.getByLabel('Password').fill(qaUser.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await context.clearCookies()
    await page.goto('/login')
    await page.getByLabel('Email').fill(qaUser.email)
    await page.getByLabel('Password').fill(`${qaUser.password}-wrong`)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible()
  })
})
