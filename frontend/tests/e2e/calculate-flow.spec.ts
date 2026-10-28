import { expect, test } from '@playwright/test'
import { runPortlandScenario } from './helpers'

test('Portland sample runs end to end and shows partner relief figures', async ({ page }) => {
  await runPortlandScenario(page)
  await expect(page.getByTestId('hero-relief')).toHaveText('$633')
  await expect(page.getByTestId('avg-relief')).toHaveText('$678')
  await expect(page.getByTestId('payment-with-second')).toHaveText('$3,226')
  await expect(page.getByTestId('risk-pill')).toBeVisible()
})

test('lookup prefill populates tax and insurance', async ({ page }) => {
  await page.goto('/calculate?tax_rate=0.0115&insurance_annual=1825&purchase_price=515000')
  await expect(page.getByLabel('Property tax rate')).toHaveValue('1.15')
  await expect(page.getByLabel('Homeowner insurance')).toHaveValue('1825')
  await expect(page.getByLabel('Purchase price')).toHaveValue('515000')
})

test('network failure shows a structured error', async ({ page }) => {
  await page.route('**/api/proxy/api/v1/transactions/initiate', route => route.abort())
  await page.goto('/calculate')
  await page.getByTestId('submit-scenario').click()
  await expect(page.getByTestId('error-list')).toContainText('Could not reach the RBridge service')
})
