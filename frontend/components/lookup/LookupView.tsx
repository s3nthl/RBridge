'use client'

import { useState } from 'react'
import { Card, ErrorList } from '@/components/ui/primitives'
import { AddressSearch } from './AddressSearch'
import { PropertyMap } from './PropertyMap'
import { PropertyResults } from './PropertyResults'
import {
  cleanAddress,
  type Construction,
  type GeocodeSuggestion,
  type PropertyApi,
  type PropertyApiError,
  type RatesApi,
} from './types'

// Homes built in or after this year get the new-construction insurance discount.
const NEW_CONSTRUCTION_YEAR = 2020

interface Selected {
  address: string
  lat: number
  lon: number
}

export default function LookupView() {
  const [selected, setSelected] = useState<Selected | null>(null)
  const [property, setProperty] = useState<PropertyApi | null>(null)
  const [rates, setRates] = useState<RatesApi | null>(null)
  const [construction, setConstruction] = useState<Construction>('existing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runLookup(s: GeocodeSuggestion) {
    const address = cleanAddress(s) || s.display_name
    setSelected({ address, lat: parseFloat(s.lat), lon: parseFloat(s.lon) })
    setProperty(null)
    setError(null)

    if (!s.street || !s.city || !s.state_code) {
      setError('That result is missing a street, city or state. Try a more specific address.')
      return
    }

    setLoading(true)
    try {
      const url = new URL('/api/lookup/property', window.location.origin)
      url.searchParams.set('street', s.street)
      url.searchParams.set('city', s.city)
      url.searchParams.set('state', s.state_code)
      if (s.postcode) url.searchParams.set('zip', s.postcode)

      const [propRes, ratesRes] = await Promise.all([
        fetch(url.toString()),
        fetch('/api/lookup/rates').catch(() => null),
      ])

      if (!propRes.ok) {
        const body = (await propRes.json().catch(() => null)) as PropertyApiError | null
        setError(body?.message ?? `Property lookup failed (HTTP ${propRes.status}). Try again in a moment.`)
        return
      }

      const data = (await propRes.json()) as PropertyApi
      setRates(ratesRes?.ok ? ((await ratesRes.json()) as RatesApi) : null)
      if (data.year_built != null) {
        setConstruction(data.year_built >= NEW_CONSTRUCTION_YEAR ? 'new' : 'existing')
      }
      setProperty(data)
    } catch {
      setError('Could not reach the property service. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <AddressSearch onSelect={runLookup} disabled={loading} />
          <p className="mt-3 px-1 text-xs text-ink-3">
            Pulls the county tax record and a valuation for the address, then estimates insurance from state averages.
          </p>
        </Card>
        <PropertyMap
          lat={selected?.lat ?? null}
          lon={selected?.lon ?? null}
          address={selected?.address}
          className="h-72 sm:h-96"
        />
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {error && <ErrorList errors={[{ code: 'LOOKUP_FAILED', message: error }]} />}

        {loading && (
          <Card className="space-y-4 p-6" data-testid="lookup-loading">
            <p className="text-sm text-ink-2">Looking up {selected?.address}…</p>
            {[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-sunken" />)}
          </Card>
        )}

        {!loading && property && selected && (
          <PropertyResults
            address={selected.address}
            property={property}
            rates={rates}
            construction={construction}
            onConstructionChange={setConstruction}
          />
        )}

        {!loading && !property && !error && (
          <Card className="p-6">
            <p className="font-display text-2xl text-ink">What you&apos;ll get</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-2">
              <li className="flex gap-3"><Dot />Estimated value from a valuation model or the tax roll</li>
              <li className="flex gap-3"><Dot />Property tax amount and effective rate, checked against the program maximum</li>
              <li className="flex gap-3"><Dot />Homeowner insurance estimate and taxes &amp; insurance per month</li>
              <li className="flex gap-3"><Dot />Today&apos;s 30-year rate, then one click into an RBridge scenario</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
}
