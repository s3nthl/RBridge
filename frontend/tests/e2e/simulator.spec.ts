import { expect, test, type Page } from '@playwright/test'

// Runs against the real backend through the Next.js proxy so the numbers
// on screen are the calc engine's, not a mock's.
const CALCULATE = '**/api/proxy/api/v1/calculate'

async function loadSimulator(page: Page) {
  const first = page.waitForResponse(CALCULATE)
  await page.goto('/simulator')
  await first
  await expect(page.getByTestId('sim-results')).toBeVisible()
}

test('loads with the Portland example numbers', async ({ page }) => {
  await loadSimulator(page)
  await expect(page.getByTestId('sim-without-year1')).toHaveText('$3,859')
  await expect(page.getByTestId('sim-with-year1')).toHaveText('$3,226')
  await expect(page.getByTestId('sim-relief-year1')).toHaveText('$633')
  await expect(page.getByTestId('sim-avg-relief')).toHaveText('$678/mo')
  await expect(page.getByTestId('sim-balance')).toHaveText('$49,570')
  await expect(page.getByTestId('sim-pmi')).toHaveText('$209/mo')
})

test('moving the tax slider recalculates', async ({ page }) => {
  await loadSimulator(page)

  const recalculated = page.waitForResponse(
    res => res.url().includes('/api/v1/calculate') && res.request().postDataJSON()?.scenario?.tax_rate === 0.012,
  )
  await page.getByLabel('Property tax rate').fill('1.2')
  await recalculated

  await expect(page.getByTestId('tax-rate-value')).toHaveText('1.20%')
  // 1.2% of $600k = $7,200 tax + $1,600 insurance → $733/mo in year 1
  await expect(page.getByTestId('sim-relief-year1')).toHaveText('$733')
})

test('a tax rate above the program max shows the guardrail error', async ({ page }) => {
  await loadSimulator(page)

  const rejected = page.waitForResponse(
    res => res.url().includes('/api/v1/calculate') && res.request().postDataJSON()?.scenario?.tax_rate === 0.02,
  )
  await page.getByLabel('Property tax rate').fill('2')
  await rejected

  await expect(page.locator('[data-code="TAX_RATE_ABOVE_MAX"]')).toBeVisible()
  // Last good numbers stay on screen, dimmed.
  await expect(page.getByTestId('sim-results')).toHaveAttribute('data-stale', 'true')
  await expect(page.getByTestId('sim-relief-year1')).toHaveText('$633')
})

test('use these numbers links to the calculator with the scenario', async ({ page }) => {
  await loadSimulator(page)
  const href = await page.getByTestId('use-numbers').getAttribute('href')
  expect(href).toContain('/calculate?')
  expect(href).toContain('purchase_price=600000')
  expect(href).toContain('tax_rate=0.01')
  expect(href).toContain('insurance_annual=1600')
})

test('query params pre-fill the sliders', async ({ page }) => {
  const first = page.waitForResponse(CALCULATE)
  await page.goto('/simulator?purchase_price=700000&tax_rate=0.012&funding_months=48')
  await first
  await expect(page.getByTestId('purchase-price-value')).toHaveText('$700,000')
  await expect(page.getByTestId('tax-rate-value')).toHaveText('1.20%')
  await expect(page.getByTestId('funding-months-value')).toHaveText('48 months')
})
