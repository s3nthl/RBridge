import { expect, test } from '@playwright/test'
import { runPortlandScenario } from './helpers'

test('invalid token shows the expired state', async ({ page }) => {
  await page.goto('/results/not-a-real-token')
  await expect(page.getByTestId('expired-state')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Run a new scenario' })).toBeVisible()
})

test('result shows year table, balance chart and both exit options', async ({ page }) => {
  await runPortlandScenario(page)
  await expect(page.getByTestId('year-table').locator('tbody tr')).toHaveCount(5)
  await expect(page.getByTestId('balance-chart')).toBeVisible()
  await expect(page.getByTestId('end-balance')).toHaveText('$49,570')
  await expect(page.getByTestId('option-a')).toContainText('$415/mo')
  await expect(page.getByTestId('option-b')).toContainText('PMI applies')
  await expect(page.getByTestId('breakeven')).toContainText('1.13 pts lower')
  await expect(page.getByTestId('risk-factors').locator('li')).toHaveCount(5)
})

test('capped scenario marks the month the cap is reached', async ({ page }) => {
  await page.goto('/calculate')
  await page.getByTestId('sample-DEMO-HCOL').click()
  await page.getByTestId('submit-scenario').click()
  await page.waitForURL(/\/results\//)
  await expect(page.getByTestId('cap-reached-marker')).toBeVisible()
})
