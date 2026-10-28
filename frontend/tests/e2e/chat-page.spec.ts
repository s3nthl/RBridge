import { expect, test } from '@playwright/test'
import { runPortlandScenario } from './helpers'

test('invalid token shows the closed state', async ({ page }) => {
  await page.goto('/chat/not-a-real-token')
  await expect(page.getByTestId('session-closed')).toBeVisible()
})

test('suggestions load and a sent message gets a reply', async ({ page }) => {
  const token = await runPortlandScenario(page)
  await page.getByTestId('chat-cta').click()
  await page.waitForURL(`**/chat/${token}`)
  await expect(page.getByTestId('suggestions').getByRole('button')).toHaveCount(3)

  await page.getByLabel('Your question').fill('Why does relief grow each year?')
  const reply = page.waitForResponse(r => r.url().includes('/messages') && r.request().method() === 'POST')
  await page.getByTestId('chat-send').click()
  await reply
  await expect(page.getByTestId('message-user')).toContainText('Why does relief grow')
  await expect(page.getByTestId('message-assistant')).toContainText('Dev mode')
})

test('ending the session closes the link', async ({ page }) => {
  const token = await runPortlandScenario(page)
  await page.goto(`/chat/${token}`)
  await page.getByRole('button', { name: 'End session' }).click()
  await expect(page.getByTestId('session-closed')).toBeVisible()
  await page.goto(`/results/${token}`)
  await expect(page.getByTestId('expired-state')).toBeVisible()
})
