import { expect, test } from '@playwright/test'

type QaUser = {
  email: string
  password: string
}

function buildQaUser(prefix: string): QaUser {
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  return {
    email: `${prefix}${stamp}@gmail.com`,
    password: `QaPass!${stamp}`,
  }
}

async function signupAndCreateHousehold(page: import('@playwright/test').Page, prefix: string) {
  const user = buildQaUser(prefix)
  const inventorySpaceName = `QA Inventory Space ${Date.now()}`

  await page.goto('/signup')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel('Inventory Space Name').fill(inventorySpaceName)
  await page.getByRole('button', { name: 'Create Inventory Space' }).click()
  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
}

test.describe('T-009-UI: AI assistant panel', () => {
  test('shows mocked success response and renders item + product citation links', async ({ page }) => {
    await page.route('**/api/ai/ask', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          answer: 'You have both an item and a product citation.',
          confidence: 'high',
          citations: [
            {
              entityType: 'item',
              itemId: 'item-1',
              itemName: 'AA Batteries',
              quantity: 2,
              unit: 'pack',
              roomId: 'room-1',
              expiryDate: null,
            },
            {
              entityType: 'product',
              itemId: 'product-1',
              itemName: 'Almond Milk',
              quantity: 12,
              unit: 'pcs',
              roomId: null,
              expiryDate: null,
            },
          ],
          suggestions: [],
          clarifyingQuestion: null,
        }),
      })
    })

    await signupAndCreateHousehold(page, 'qa-ai-panel-')

    await page.getByRole('button', { name: 'Open AI assistant' }).click()
    await page.getByTestId('ai-question-input').fill('Do I have batteries?')
    await page.getByTestId('ai-submit-button').click()

    await expect(page.getByTestId('ai-response')).toBeVisible()
    await expect(page.getByText('You have both an item and a product citation.')).toBeVisible()

    const itemLink = page.getByRole('link', { name: /AA Batteries/i }).first()
    await expect(itemLink).toHaveAttribute('href', /\/dashboard\/item-1\?household=/)
    await expect(itemLink).toHaveAttribute('data-entity-type', 'item')

    const productLink = page.getByRole('link', { name: /Almond Milk/i }).first()
    await expect(productLink).toHaveAttribute('href', /\/dashboard\/business\/products\/product-1\?space=/)
    await expect(productLink).toHaveAttribute('data-entity-type', 'product')
  })

  test('shows error state when API returns forbidden', async ({ page }) => {
    await page.route('**/api/ai/ask', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Access denied for inventory space',
          errorCode: 'forbidden_household',
        }),
      })
    })

    await signupAndCreateHousehold(page, 'qa-ai-panel-403-')

    await page.getByRole('button', { name: 'Open AI assistant' }).click()
    await page.getByTestId('ai-question-input').fill('Do I have milk?')
    await page.getByTestId('ai-submit-button').click()

    await expect(page.getByTestId('ai-error')).toBeVisible()
    await expect(page.getByText('Access denied for inventory space')).toBeVisible()
  })
})

