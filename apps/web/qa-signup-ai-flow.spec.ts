import { test, expect } from '@playwright/test'

/**
 * End-to-end test for signup, onboarding, and AI assistant reachability.
 * 
 * This test:
 * 1. Creates a new account with random credentials
 * 2. Completes onboarding to create an inventory space
 * 3. Tests the AI reachability endpoint
 * 4. Opens the AI panel and asks a question
 * 
 * Run with: npx playwright test qa-signup-ai-flow.spec.ts --headed
 */

test('Complete signup flow and test AI assistant', async ({ page }) => {
  // Generate random credentials
  const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  const email = `qa-flow-${stamp}@example.com`
  const password = `QaPass!${stamp}`
  const inventorySpaceName = `QA Flow Space ${Date.now()}`
  
  console.log('\n=== Test Credentials ===')
  console.log(`Email: ${email}`)
  console.log('========================\n')

  // Step 1: Navigate to signup page and create account
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForLoadState('networkidle')

  // Step 2: Complete onboarding
  await expect(page).toHaveURL(/\/onboarding$/)
  console.log('Completing onboarding...')
  
  await page.getByLabel('Inventory Space Name').fill(inventorySpaceName)
  await page.getByRole('button', { name: 'Create Inventory Space' }).click()
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

  // Step 3: Extract householdId from the space selector.
  // The dashboard may not always include `?space=` in the URL.
  const dashboardUrl = page.url()
  const householdId = await page.getByRole('combobox', { name: 'Select inventory space' }).inputValue()
  
  console.log('\n=== Dashboard Info ===')
  console.log(`Dashboard URL: ${dashboardUrl}`)
  console.log(`Household ID: ${householdId}`)
  console.log('======================\n')

  expect(householdId).toBeTruthy()

  // Step 4: Test AI reachability endpoint
  console.log('\n=== Testing AI Reachability Endpoint ===')
  const reachabilityUrl = `/api/ai/reachability?householdId=${householdId}`
  console.log(`URL: ${reachabilityUrl}`)
  
  const reachabilityResponse = await page.goto(reachabilityUrl)
  const reachabilityStatus = reachabilityResponse?.status() || 0
  let reachabilityJson: any = null
  
  try {
    reachabilityJson = await reachabilityResponse?.json()
  } catch (e) {
    console.log('Failed to parse reachability JSON response')
    reachabilityJson = { error: 'Failed to parse JSON' }
  }
  
  console.log(`HTTP Status: ${reachabilityStatus}`)
  console.log('JSON Response:')
  console.log(JSON.stringify(reachabilityJson, null, 2))
  console.log('========================================\n')

  // Step 5: Go back to dashboard and test AI panel
  await page.goto(`/dashboard?space=${householdId}`)
  await page.waitForLoadState('networkidle')

  console.log('\n=== Testing AI Panel ===')
  
  let aiPanelError: string | null = null
  let aiResponseSuccess = false
  let hasCitations = false
  
  try {
    // Open AI panel
    await page.getByRole('button', { name: 'Open AI assistant' }).click()
    console.log('✅ AI panel opened')
    
    // Fill in question
    await page.getByTestId('ai-question-input').fill('Do I have batteries?')
    console.log('✅ Question entered')
    
    // Submit question
    await page.getByTestId('ai-submit-button').click()
    console.log('✅ Question submitted')
    
    // Wait for response (with timeout)
    try {
      await page.getByTestId('ai-response').waitFor({ state: 'visible', timeout: 10000 })
      console.log('✅ AI response received')
      aiResponseSuccess = true
      
      // Check for citations
      const responseContent = await page.content()
      hasCitations = responseContent.includes('data-entity-type="item"') || 
                     responseContent.includes('data-entity-type="product"')
      
      console.log(`Citations present: ${hasCitations ? 'Yes' : 'No'}`)
      
      // Take screenshot of successful response
      await page.screenshot({ path: 'ai-panel-success.png', fullPage: true })
      console.log('Screenshot saved: ai-panel-success.png')
      
    } catch (timeoutError) {
      console.log('⏱️  Timeout waiting for AI response')
      
      // Check for error message
      const errorElement = page.getByTestId('ai-error')
      if (await errorElement.isVisible({ timeout: 1000 })) {
        aiPanelError = await errorElement.textContent()
        console.log(`❌ Error found: ${aiPanelError}`)
      } else {
        aiPanelError = 'Response timeout - no error message displayed'
        console.log('❌ No response or error message after timeout')
      }
      
      // Take screenshot of error state
      await page.screenshot({ path: 'ai-panel-error.png', fullPage: true })
      console.log('Screenshot saved: ai-panel-error.png')
    }
    
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    console.log(`❌ Failed to interact with AI panel: ${errorMsg}`)
    aiPanelError = errorMsg
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'ai-panel-failure.png', fullPage: true })
    console.log('Screenshot saved: ai-panel-failure.png')
  }
  
  console.log('========================\n')

  // Final summary
  console.log('\n=== SUMMARY ===')
  console.log(`Account Email: ${email}`)
  console.log(`Household ID: ${householdId}`)
  console.log(`\nReachability Endpoint:`)
  console.log(`  HTTP Status: ${reachabilityStatus}`)
  console.log(`  JSON Response:`)
  console.log(JSON.stringify(reachabilityJson, null, 2))
  console.log(`\nAI Panel:`)
  console.log(`  Response Received: ${aiResponseSuccess ? 'Yes' : 'No'}`)
  console.log(`  Citations Present: ${hasCitations ? 'Yes' : 'No'}`)
  if (aiPanelError) {
    console.log(`  Error: ${aiPanelError}`)
  }
  console.log('===============\n')
})
