# QA AI Assistant E2E Strategy

## Overview

Playwright E2E tests for the AI assistant are **deterministic** and **CI-safe** by intercepting `POST /api/ai/ask` and returning fixture responses. The real AI backend is not required.

## Test Scenarios

| Scenario | Description | Fixture |
|----------|-------------|---------|
| Happy path | User opens panel, submits question, sees assistant response | `ai-ask-success-item.json` |
| Item citation | Citation with `entityType: item` renders and links to `/dashboard/{itemId}?household={householdId}` | `ai-ask-success-item.json` |
| Product citation | Citation with `entityType: product` renders and links to `/dashboard/business/products/{productId}?space={householdId}` | `ai-ask-success-product.json` |
| Error 403 | Access denied renders user-friendly message | `ai-ask-error-403.json` |
| Error 500 | Server/provider error renders user-friendly message | `ai-ask-error-500.json` |

## Selectors Strategy

Prefer stable, semantic selectors to avoid flakiness:

| Element | Selector | Rationale |
|---------|----------|-----------|
| Open/close trigger | `getByRole('button', { name: 'Open AI assistant' })` | aria-label for intent |
| Panel region | `getByRole('region', { name: 'AI assistant' })` | Landmark for panel |
| Question input | `getByTestId('ai-question-input')` | Form field |
| Submit button | `getByTestId('ai-submit-button')` | Action |
| Response area | `getByTestId('ai-response')` | Content container |
| Error area | `getByTestId('ai-error')` | Error state |
| Citations | `getByTestId('ai-citations')` | Citation list |
| Citation link | `getByRole('link', { name: /View (item\|product): {name}/i })` | Accessible link with entity type |

### UI Hooks (aria-labels / data-testid)

The `AIAssistantPanel` component uses:

- `aria-label="Open AI assistant"` / `aria-label="Close AI assistant"` on trigger
- `aria-expanded` / `aria-controls` for panel state
- `aria-label="AI assistant"` on panel region
- `aria-label="Ask a question about your inventory"` on input
- `aria-label="Submit question"` on submit button
- `aria-label="Assistant response"` on answer container
- `aria-label="Assistant error"` on error container
- `aria-label="Citations"` on citation list
- `aria-label="View {entityType}: {itemName}"` on each citation link
- `data-entity-type` and `data-item-id` on citation links for assertions

## Fixture Payloads

### Success with item citation (`ai-ask-success-item.json`)

```json
{
  "success": true,
  "answer": "Yes, I found 1 matching item(s): AA Batteries (2 pack). Evidence: AA Batteries.",
  "confidence": "high",
  "citations": [
    {
      "entityType": "item",
      "itemId": "item-fixture-battery",
      "itemName": "AA Batteries",
      "quantity": 2,
      "unit": "pack",
      "roomId": "room-fixture-1",
      "expiryDate": null
    }
  ],
  "suggestions": [],
  "clarifyingQuestion": null
}
```

### Success with product citation (`ai-ask-success-product.json`)

```json
{
  "success": true,
  "answer": "On hand: Widget Pro: 15 units. Evidence: Widget Pro.",
  "confidence": "high",
  "citations": [
    {
      "entityType": "product",
      "itemId": "product-fixture-widget",
      "itemName": "Widget Pro",
      "quantity": 15,
      "unit": "units",
      "roomId": null,
      "expiryDate": null
    }
  ],
  "suggestions": [],
  "clarifyingQuestion": null
}
```

### Error 403 (`ai-ask-error-403.json`)

```json
{
  "success": false,
  "error": "Access denied for inventory space",
  "errorCode": "forbidden_household"
}
```

### Error 500 (`ai-ask-error-500.json`)

```json
{
  "success": false,
  "error": "Something went wrong. Please try again later.",
  "errorCode": "provider_unavailable"
}
```

## Route Interception Pattern

```ts
await page.route('**/api/ai/ask', async (route) => {
  if (route.request().method() === 'POST') {
    const fixture = loadFixture('ai-ask-success-item.json')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    })
  } else {
    await route.continue()
  }
})
```

For error scenarios, use `status: 403` or `status: 500` with the corresponding fixture body.

## Running Tests

```bash
pnpm --filter @open-inventory/web exec playwright test qa-ai-assistant.spec.ts
```

## Dependencies

- User must be authenticated with at least one household (use `signupAndCreateHousehold` helper).
- Personal dashboard (`/dashboard`) for item citations.
- Business dashboard (`/dashboard/business`) for product citations.
