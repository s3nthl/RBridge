import { expect, test } from '@playwright/test'

test('credit score below the floor is rejected', async ({ page }) => {
  await page.goto('/calculate')
  await page.getByLabel('Credit score').fill('560')
  const response = page.waitForResponse('**/transactions/initiate')
  await page.getByTestId('submit-scenario').click()
  await response
  await expect(page.locator('[data-code="CREDIT_SCORE_TOO_LOW"]')).toBeVisible()
  await expect(page).toHaveURL(/\/calculate/)
})

test('tax rate above the program maximum is rejected', async ({ page }) => {
  await page.goto('/calculate')
  await page.getByLabel('Property tax rate').fill('2')
  const response = page.waitForResponse('**/transactions/initiate')
  await page.getByTestId('submit-scenario').click()
  await response
  await expect(page.locator('[data-code="TAX_RATE_ABOVE_MAX"]')).toBeVisible()
  await expect(page.locator('#tax_rate-error')).toBeVisible()
})
