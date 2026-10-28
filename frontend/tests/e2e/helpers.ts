import { expect, type Page } from '@playwright/test'

/** Submits the Portland sample and returns the result token. */
export async function runPortlandScenario(page: Page): Promise<string> {
  await page.goto('/calculate')
  await page.getByTestId('sample-DEMO-PDX').click()
  await page.getByTestId('submit-scenario').click()
  await page.waitForURL(/\/results\/[^/]+$/)
  await expect(page.getByTestId('hero-relief')).toBeVisible()
  return page.url().split('/results/')[1]
}
