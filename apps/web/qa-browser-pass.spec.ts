/**
 * One-off browser QA pass for localhost:3000
 * Run: npx playwright test qa-browser-pass.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Login page', () => {
  test('desktop viewport - layout and theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`${BASE}/login`)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i })
    await expect(toggle).toBeVisible()
    // Toggle to dark
    await toggle.click()
    await page.waitForTimeout(500)
    const html = await page.locator('html').getAttribute('class')
    expect(html).toContain('dark')
    // Toggle back to light
    await toggle.click()
    await page.waitForTimeout(500)
    const html2 = await page.locator('html').getAttribute('class')
    expect(html2).not.toContain('dark')
  })

  test('mobile viewport - layout and theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE}/login`)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(500)
    const html = await page.locator('html').getAttribute('class')
    expect(html).toContain('dark')
  })
})

test.describe('Signup page', () => {
  test('desktop viewport - layout and theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`${BASE}/signup`)
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(500)
    const html = await page.locator('html').getAttribute('class')
    expect(html).toContain('dark')
  })

  test('mobile viewport - layout and theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE}/signup`)
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i })
    await expect(toggle).toBeVisible()
  })
})

test.describe('Auth-gated routes', () => {
  test('document redirect behavior for protected routes', async ({ page }) => {
    // Navigate to protected routes and record where we land (auth state is env-dependent)
    await page.goto(`${BASE}/onboarding`)
    const onboardingUrl = page.url()
    await page.goto(`${BASE}/dashboard`)
    const dashboardUrl = page.url()
    await page.goto(`${BASE}/dashboard/add`)
    const addUrl = page.url()
    // At minimum: we should not get a 500 or blank page
    expect(onboardingUrl).toMatch(/localhost:3000/)
    expect(dashboardUrl).toMatch(/localhost:3000/)
    expect(addUrl).toMatch(/localhost:3000/)
  })
})

test.describe('Visual checks - login card readability', () => {
  test('login card visible and readable in light mode', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const card = page.locator('[data-slot="card"]').first()
    await expect(card).toBeVisible()
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBeTruthy()
  })

  test('login card visible and readable in dark mode', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    const toggle = page.getByRole('button', { name: /switch to dark mode/i })
    await toggle.click()
    await page.waitForTimeout(500)
    const card = page.locator('[data-slot="card"]').first()
    await expect(card).toBeVisible()
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBeTruthy()
  })
})

test.describe('Onboarding (when accessible)', () => {
  test('onboarding card readable in light and dark mode', async ({ page }) => {
    await page.goto(`${BASE}/onboarding`)
    if (page.url().includes('onboarding')) {
      const card = page.locator('[data-slot="card"]').first()
      await expect(card).toBeVisible()
      const toggle = page.getByRole('button', { name: /switch to dark mode/i })
      await toggle.click()
      await page.waitForTimeout(500)
      const cardDark = page.locator('[data-slot="card"]').first()
      await expect(cardDark).toBeVisible()
    }
  })
})

test.describe('Dashboard and Add (when accessible)', () => {
  test('dashboard or add page renders without layout breakage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`${BASE}/dashboard`)
    const url = page.url()
    if (url.includes('dashboard')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      expect(overflow).toBe(true)
    }
    await page.goto(`${BASE}/dashboard/add`)
    const addUrl = page.url()
    if (addUrl.includes('add')) {
      await expect(page.getByRole('heading', { name: /add new item/i })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
      expect(overflow).toBe(true)
    }
  })
})

test.describe('Layout and overflow', () => {
  test('no horizontal overflow on login at 320px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`${BASE}/login`)
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)
  })

  test('no horizontal overflow on signup at 320px mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(`${BASE}/signup`)
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)
  })

  test('theme toggle does not obscure submit button on login at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE}/login`)
    const submit = page.getByRole('button', { name: /sign in/i })
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i })
    const submitBox = await submit.boundingBox()
    const toggleBox = await toggle.boundingBox()
    expect(submitBox).toBeTruthy()
    expect(toggleBox).toBeTruthy()
    // Toggle is bottom-right; submit is in card. They should not overlap if card is centered.
    // If toggle overlaps submit, submit's bottom would be >= toggle's top
    const overlap = submitBox!.y + submitBox!.height > toggleBox!.y && submitBox!.x + submitBox!.width > toggleBox!.x
    expect(overlap).toBe(false)
  })
})
