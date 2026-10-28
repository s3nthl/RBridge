import { expect, test } from '@playwright/test'

test.describe('FAQ page', () => {
  test('lists the program questions', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Frequently asked.')
    await expect(page.locator('details')).toHaveCount(12)
    await expect(page).toHaveTitle(/FAQ · RBridge/)
  })

  test('accordion opens and closes', async ({ page }) => {
    await page.goto('/faq')
    const item = page.getByTestId('faq-cap')
    const answer = item.getByText(/capped at 10% of the purchase price/)

    await expect(item).not.toHaveAttribute('open', '')
    await expect(answer).toBeHidden()

    await item.locator('summary').click()
    await expect(item).toHaveAttribute('open', '')
    await expect(answer).toBeVisible()

    await item.locator('summary').click()
    await expect(item).not.toHaveAttribute('open', '')
    await expect(answer).toBeHidden()
  })

  test('accordion works from the keyboard', async ({ page }) => {
    await page.goto('/faq')
    const item = page.getByTestId('faq-cash-out')
    await item.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(item).toHaveAttribute('open', '')
    await expect(item.getByText(/Nothing is paid to the borrower/)).toBeVisible()
  })

  test('deep link to a question opens nothing by default but scrolls to it', async ({ page }) => {
    await page.goto('/faq#pmi')
    await expect(page.getByTestId('faq-pmi')).toBeInViewport()
  })
})
