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

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}${Math.random().toString(36).slice(2, 6)}`
}

async function signupAndCreateFirstSpace(
  page: import('@playwright/test').Page,
  prefix: string,
): Promise<string> {
  const user = buildQaUser(prefix)
  const firstSpaceName = uniqueName('QA Primary Space')

  await page.goto('/signup')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/signup')) {
    const signupAlert = (await page.getByRole('alert').first().textContent())?.toLowerCase() ?? ''
    const isRateLimited = signupAlert.includes('rate limit exceeded')
    const needsEmailConfirmation = signupAlert.includes('confirm your email')
    test.skip(
      isRateLimited || needsEmailConfirmation,
      isRateLimited
        ? 'signup blocked by Supabase rate limit'
        : 'requires signup confirmation OFF in active environment',
    )
  }

  await expect(page).toHaveURL(/\/onboarding$/)
  await page.getByLabel('Inventory Space Name').fill(firstSpaceName)
  await page.getByRole('button', { name: 'Create Inventory Space' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  return firstSpaceName
}

async function createRoom(page: import('@playwright/test').Page, roomName: string) {
  if (!(await page.getByRole('button', { name: 'Create room' }).isVisible())) {
    await page.getByRole('button', { name: 'Add Room' }).click()
  }
  await page.getByLabel('New room name').fill(roomName)
  await page.getByRole('button', { name: 'Create room' }).click()
  await expect(page.getByRole('combobox', { name: 'Select room' })).toContainText(roomName)
}

async function selectRoom(page: import('@playwright/test').Page, roomName: string) {
  await page.getByRole('combobox', { name: 'Select room' }).selectOption({ label: roomName })
  await expect(page.getByRole('heading', { name: roomName })).toBeVisible()
}

async function addItemInSelectedRoom(
  page: import('@playwright/test').Page,
  itemName: string,
  quantity: string,
  unit: string,
  expiryDate?: string,
) {
  await page.getByRole('link', { name: 'Add Item' }).click()
  await expect(page).toHaveURL(/\/dashboard\/add/)
  await page.getByLabel('Name').fill(itemName)
  await page.getByLabel('Quantity').fill(quantity)
  await page.getByLabel('Unit').fill(unit)
  if (expiryDate) {
    await page.getByLabel('Expiry Date').fill(expiryDate)
  }
  await page.getByRole('button', { name: 'Add Item' }).click()
  await expect(page).toHaveURL(/\/dashboard\?space=/)
}

async function createSpaceFromDashboard(page: import('@playwright/test').Page) {
  const beforeSpaceId = new URL(page.url()).searchParams.get('space')
  await page.getByRole('button', { name: 'New Space' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('space')).not.toBe(beforeSpaceId)
  const nextSpaceId = new URL(page.url()).searchParams.get('space')
  expect(nextSpaceId).toBeTruthy()
  return nextSpaceId
}

test.describe('T-008.10 pre-AI usability QA gate', () => {
  test('desktop: coordinated controls, dashboard create-space, accessibility, warning flows, and room-required add', async ({
    page,
  }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width: 1280, height: 900 })

    const firstSpaceName = await signupAndCreateFirstSpace(page, 'qa-preai-desktop-')

    await expect(page.getByRole('combobox', { name: 'Select inventory space' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Select room' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Space' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Room' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit selected space' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit Room' })).not.toBeVisible()

    const kitchenRoom = uniqueName('Kitchen')
    await createRoom(page, kitchenRoom)
    await selectRoom(page, kitchenRoom)
    await expect(page.getByRole('button', { name: 'Edit Room' })).toBeVisible()

    const expiringItemName = uniqueName('Expiring Milk')
    await addItemInSelectedRoom(page, expiringItemName, '1', 'carton', '2026-12-31')
    await expect(page.getByRole('heading', { name: kitchenRoom })).toBeVisible()

    const roomNameLink = page.getByRole('link', {
      name: new RegExp(`${expiringItemName}.*1 carton`),
    })
    await expect(roomNameLink).toBeVisible()
    await expect(roomNameLink).toContainText('Expires')

    const renameRoomButton = page.getByRole('button', { name: 'Edit Room' })
    await renameRoomButton.click()
    await page.getByLabel(`Rename room ${kitchenRoom}`).fill('   ')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Room name is required.')).toBeVisible()
    const renamedRoom = uniqueName('Kitchen Renamed')
    await page.getByLabel(`Rename room ${kitchenRoom}`).fill(renamedRoom)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('combobox', { name: 'Select room' })).toHaveValue(/.+/)
    await expect(page.getByRole('heading', { name: renamedRoom })).toBeVisible()

    await page.getByRole('button', { name: 'Edit Room' }).click()
    await page.getByRole('button', { name: 'Delete Room' }).click()
    await expect(
      page.getByText(`Room "${renamedRoom}" has 1 item(s). Confirm deletion to continue.`),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel room delete' }).click()
    await expect(
      page.getByText(`Room "${renamedRoom}" has 1 item(s). Confirm deletion to continue.`),
    ).not.toBeVisible()

    const editSpaceButton = page.getByRole('button', { name: 'Edit selected space' })
    await editSpaceButton.focus()
    await expect(page.getByRole('tooltip', { name: 'Edit selected space' })).toBeVisible()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Delete selected space' }).click()
    await expect(
      page.getByText(new RegExp(`This space has \\d+ room\\(s\\)\\. Confirm deletion to continue\\.`)),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel space delete' }).click()

    await page.getByLabel('Rename selected inventory space').fill('   ')
    await page.getByRole('button', { name: 'Rename space' }).click()
    await expect(page.getByText('Inventory Space name is required.')).toBeVisible()
    const renamedSpace = uniqueName('QA Renamed Space')
    await page.getByLabel('Rename selected inventory space').fill(renamedSpace)
    await page.getByRole('button', { name: 'Rename space' }).click()
    await expect(page.getByText('Inventory Space renamed.')).toBeVisible()

    await page.keyboard.press('Escape')
    const deleteRoomButton = page.getByRole('button', { name: 'Delete Room' })
    await expect(deleteRoomButton).toBeVisible()
    await deleteRoomButton.focus()
    await expect(page.getByRole('tooltip', { name: 'Delete Room' })).toBeVisible()

    const secondSpaceId = await createSpaceFromDashboard(page)
    expect(secondSpaceId).toBeTruthy()
    await expect(page.getByRole('combobox', { name: 'Select inventory space' }).locator('option')).toHaveCount(2)
    await expect(page.getByRole('combobox', { name: 'Select room' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Add Item' })).not.toBeVisible()
    await expect(page.getByText('Select or create a room to start managing inventory items.')).toBeVisible()

    await page.goto(`/dashboard/add?space=${secondSpaceId ?? ''}`)
    await expect(
      page.getByText('Create a room in your selected Inventory Space before adding items.'),
    ).toBeVisible()

    await page.goto('/dashboard')
    await page.getByRole('combobox', { name: 'Select inventory space' }).selectOption({ label: renamedSpace })
    await expect(page.getByRole('combobox', { name: 'Select room' })).toBeEnabled()
    await selectRoom(page, renamedRoom)
    await expect(page.getByRole('link', { name: 'Add Item' })).toBeVisible()
    await expect(page.getByLabel('Search room items')).toBeVisible()
    await expect(page.getByLabel('Sort room items')).toBeVisible()
    await expect(page.getByRole('heading', { name: `${renamedSpace} Inventory` })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Select inventory space' })).toHaveValue(/.+/)
    await expect(page.getByRole('combobox', { name: 'Select room' })).toHaveValue(/.+/)
    await expect(firstSpaceName).not.toEqual(renamedSpace)
  })

  test('mobile: selected room controls and add-item placement remain usable', async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 390, height: 844 })

    await signupAndCreateFirstSpace(page, 'qa-preai-mobile-')
    await expect(page.getByText('Inventory Spaces')).not.toBeVisible()

    const mobileRoom = uniqueName('Mobile Room')
    await createRoom(page, mobileRoom)
    await selectRoom(page, mobileRoom)

    await expect(page.getByRole('link', { name: 'Add Item' })).toBeVisible()
    await expect(page.getByLabel('Search room items')).toBeVisible()
    await expect(page.getByLabel('Sort room items')).toBeVisible()

    const mobileItem = uniqueName('Mobile Item')
    await addItemInSelectedRoom(page, mobileItem, '1', 'pc')
    await expect(page.getByText(mobileItem)).toBeVisible()
  })
})
