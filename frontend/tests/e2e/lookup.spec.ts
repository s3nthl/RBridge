import { expect, test, type Page } from '@playwright/test'

// Every lookup upstream is mocked so tests never hit Nominatim, ATTOM or FRED.

const SUGGESTION = {
  display_name: '123 Main Street, Portland, Multnomah County, Oregon, 97201, United States',
  lat: '45.5152',
  lon: '-122.6784',
  street: '123 Main Street',
  city: 'Portland',
  state: 'Oregon',
  state_code: 'OR',
  postcode: '97201',
  country: 'United States',
}

const PROPERTY = {
  source: 'attom',
  property_value: 600000,
  property_value_source_detail: 'attom_avm',
  market_value: 580000,
  assessed_value: 410000,
  avm: { value: 600000, high: 640000, low: 560000, as_of: '2026-09-01' },
  annual_taxes: 6000,
  annual_taxes_estimated: false,
  tax_year: 2026,
  state_insurance_avg: 800,
  state_code: 'OR',
  year_built: 1998,
  living_area_sqft: 1850,
  beds: 3,
  baths: 2,
  property_type: 'Single family',
  lot_sqft: 5000,
  cached: false,
}

const RATES = {
  mortgage_30yr: 6.5,
  mortgage_source: 'freddie_mac',
  mortgage_as_of: '2026-10-22',
  prime_rate: 7.5,
  prime_source: 'fred',
  prime_as_of: '2026-10-22',
  fetched_at: '2026-10-27T00:00:00Z',
}

async function mockGeocodeAndRates(page: Page) {
  await page.route('**/api/lookup/geocode?**', route => route.fulfill({ json: { suggestions: [SUGGESTION] } }))
  await page.route('**/api/lookup/rates', route => route.fulfill({ json: RATES }))
}

async function searchAndPick(page: Page) {
  await page.goto('/lookup')
  const geocode = page.waitForRequest(req => req.url().includes('/api/lookup/geocode'))
  await page.getByRole('combobox', { name: 'Property address' }).fill('123 Main St Portland')
  await geocode
  await page.getByRole('option', { name: /123 Main Street, Portland, OR 97201/ }).click()
}

test('renders the search', async ({ page }) => {
  await page.goto('/lookup')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Start with the house')
  await expect(page.getByRole('combobox', { name: 'Property address' })).toBeVisible()
})

test('selecting an address shows taxes, insurance and a calculator link', async ({ page }) => {
  await mockGeocodeAndRates(page)
  await page.route('**/api/lookup/property?**', route => route.fulfill({ json: PROPERTY }))

  await searchAndPick(page)

  await expect(page.getByTestId('lookup-results')).toBeVisible()
  await expect(page.getByTestId('lookup-address')).toHaveText('123 Main Street, Portland, OR 97201')
  await expect(page.getByTestId('lookup-value')).toHaveText('$600,000')
  await expect(page.getByTestId('lookup-tax-rate')).toHaveText('1.00%')
  // $800 per $300k → $1,600/yr on $600k
  await expect(page.getByTestId('lookup-insurance')).toHaveText('$1,600/yr')
  await expect(page.getByTestId('lookup-ti-monthly')).toHaveText('$633/mo')
  await expect(page.getByTestId('lookup-tax-warning')).toHaveCount(0)

  const href = await page.getByTestId('lookup-cta').getAttribute('href')
  expect(href).toBe('/calculate?purchase_price=600000&tax_rate=0.01&insurance_annual=1600&first_lien_rate=0.065')
})

test('a tax rate above the program max is flagged', async ({ page }) => {
  await mockGeocodeAndRates(page)
  await page.route('**/api/lookup/property?**', route =>
    route.fulfill({ json: { ...PROPERTY, annual_taxes: 12000 } }),
  )

  await searchAndPick(page)

  await expect(page.getByTestId('lookup-tax-rate')).toHaveText('2.00%')
  await expect(page.getByTestId('lookup-tax-warning')).toBeVisible()
})

test('a failing property service shows an error', async ({ page }) => {
  await mockGeocodeAndRates(page)
  await page.route('**/api/lookup/property?**', route =>
    route.fulfill({ status: 500, body: 'Internal Server Error' }),
  )

  await searchAndPick(page)

  await expect(page.getByTestId('error-list')).toContainText('Property lookup failed (HTTP 500)')
  await expect(page.getByTestId('lookup-results')).toHaveCount(0)
})
