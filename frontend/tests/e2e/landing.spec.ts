import { expect, test } from '@playwright/test'

test.describe('landing page', () => {
  test('shows the hero, the Portland example and the year-1 relief', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('principal and interest')
    await expect(page.getByTestId('hero-with')).toContainText('$3,226')

    const table = page.getByTestId('portland-table')
    await expect(table).toBeVisible()
    await expect(table).toContainText('$633')
    await expect(table).toContainText('$3,859')
    await expect(table.locator('tbody tr')).toHaveCount(5)

    await expect(page.getByRole('img', { name: /second-lien balance/i })).toBeVisible()
  })

  test('how-it-works anchor scrolls to the steps', async ({ page }) => {
    await page.goto('/#how-it-works')
    const section = page.locator('#how-it-works')
    await expect(section).toBeInViewport()
    await expect(section.locator('ol > li')).toHaveCount(4)
  })

  test('hero CTA navigates to the calculator', async ({ page }) => {
    await page.goto('/')
    await page.locator('section').first().getByRole('link', { name: 'Run a scenario' }).click()
    await expect(page).toHaveURL(/\/calculate$/)
  })

  test('has no horizontal scroll at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('never mentions retired product names', async ({ page }) => {
    await page.goto('/')
    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/itsmor|lowmo|lomo|heloc|liberator/i)
  })
})
