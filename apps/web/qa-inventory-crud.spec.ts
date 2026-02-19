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

  if (page.url().includes('/signup')) {
    const alertText = (await page.getByRole('alert').first().textContent())?.toLowerCase() ?? ''
    throw new Error(`Signup did not reach onboarding. Alert: ${alertText || 'none'}`)
  }

  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel('Inventory Space Name').fill(inventorySpaceName)
  await page.getByRole('button', { name: 'Create Inventory Space' }).click()
  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
}

async function createRoom(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Add Room' }).click()
  await page.getByLabel('New room name').fill(name)
  await page.getByRole('button', { name: 'Create room' }).click()
  await expect(page.getByRole('combobox', { name: 'Select room' })).toBeEnabled()
  await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
}

test.describe('T-005 CRUD gate: authenticated inventory UX', () => {
  test('desktop add/edit/delete with success, error, and empty states', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await signupAndCreateHousehold(page, 'qa-crud-desktop-')

    await createRoom(page, 'Kitchen')
    await expect(page.getByText('No items found for this room.')).toBeVisible()

    await page.getByRole('link', { name: 'Add Item' }).click()
    await expect(page).toHaveURL(/\/dashboard\/add\?/)

    await page.getByLabel('Name').fill('AA Battery Pack')
    await page.getByLabel('Quantity').fill('12')
    await page.getByLabel('Unit').fill('pcs')
    await page.getByLabel('Description').fill('For remotes and toys')
    await page.getByRole('button', { name: 'Add Item' }).click()

    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    await expect(
      page
        .locator('main a[href^="/dashboard/"]')
        .filter({ hasText: 'AA Battery Pack' })
        .first(),
    ).toBeVisible()
    await expect(page.getByText('12 pcs')).toBeVisible()

    await page
      .locator('main a[href^="/dashboard/"]')
      .filter({ hasText: 'AA Battery Pack' })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dashboard\/.+/)
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()

    await page.getByLabel('Quantity').fill('0')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Name, quantity, and unit are required.')).toBeVisible()

    await page.getByLabel('Name').fill('AA Batteries - Updated')
    await page.getByLabel('Quantity').fill('8')
    await page.getByLabel('Unit').fill('packs')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await page.waitForURL(/\/dashboard(\?.*)?$/, { timeout: 15000 })
    await expect(
      page
        .locator('main a[href^="/dashboard/"]')
        .filter({ hasText: 'AA Batteries - Updated' })
        .first(),
    ).toBeVisible()
    await expect(page.getByText('8 packs')).toBeVisible()

    await page
      .locator('main a[href^="/dashboard/"]')
      .filter({ hasText: 'AA Batteries - Updated' })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()
    await page.getByRole('button', { name: 'Delete Item' }).click()

    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    await expect(page.getByText('No items found for this room.')).toBeVisible()
  })

  test('mobile add/edit/delete preserves key UX states', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signupAndCreateHousehold(page, 'qa-crud-mobile-')

    await expect(page.getByRole('heading', { level: 1, name: /inventory/i })).toBeVisible()
    await createRoom(page, 'Pantry')
    await expect(page.getByText('No items found for this room.')).toBeVisible()

    await page.getByRole('link', { name: 'Add Item' }).click()
    await expect(page.getByRole('heading', { name: 'Add New Item' })).toBeVisible()

    await page.getByLabel('Name').fill('Milk')
    await page.getByLabel('Quantity').fill('1')
    await page.getByLabel('Unit').fill('gal')
    await page.getByRole('button', { name: 'Add Item' }).click()

    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    const milkCard = page
      .locator('main a[href^="/dashboard/"]')
      .filter({ hasText: 'Milk' })
      .first()
    await expect(milkCard).toBeVisible()

    await milkCard.click()
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible()

    await page.getByLabel('Quantity').fill('2')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    await expect(page.getByText('2 gal')).toBeVisible()

    await page
      .locator('main a[href^="/dashboard/"]')
      .filter({ hasText: 'Milk' })
      .first()
      .click()
    await page.getByRole('button', { name: 'Delete Item' }).click()
    await expect(page.getByText('No items found for this room.')).toBeVisible()
  })
})
