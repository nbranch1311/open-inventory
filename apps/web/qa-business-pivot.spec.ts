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
  await expect(page).toHaveURL(/\/dashboard$/)
}

test.describe('Business pivot: ledger flows', () => {
  test('CSV import creates rooms/products and enables fulfill/adjust flows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await signupAndCreateHousehold(page, 'qa-business-pivot-')

    await page.goto('/dashboard/business')
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

    await page.getByRole('link', { name: 'Import CSV' }).click()
    await expect(page.getByRole('heading', { name: 'Import CSV' })).toBeVisible()

    await page.getByRole('button', { name: 'Import stock snapshot' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Imported' }).first()).toBeVisible()

    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

    // At least one product card should be present after import.
    await expect(page.getByText('SKU:').first()).toBeVisible()

    await page.getByRole('link', { name: 'Fulfill order' }).click()
    await expect(page.getByRole('heading', { name: 'Fulfill Order' })).toBeVisible()
    await page.getByLabel('Quantity sold/shipped').fill('1')
    await page.getByRole('button', { name: 'Record fulfillment' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'recorded' }).first()).toBeVisible()

    await page.getByRole('link', { name: 'Back' }).click()
    await page.getByRole('link', { name: 'Adjust stock' }).click()
    await expect(page.getByRole('heading', { name: 'Adjust Stock' })).toBeVisible()
    await page.getByLabel('Target quantity (absolute)').fill('2')
    await page.getByRole('button', { name: 'Record adjustment' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'adjusted' }).first()).toBeVisible()
  })
})

