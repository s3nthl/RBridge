// Response shapes of the /api/lookup/* route handlers.

export interface GeocodeSuggestion {
  display_name: string
  lat: string
  lon: string
  street: string | null
  city: string | null
  state: string | null
  state_code: string | null
  postcode: string | null
  country: string | null
}

export type PropertyValueSource = 'attom_avm' | 'attom_market' | 'attom_assessed' | 'state_median'

export interface AvmDetail {
  value: number
  high: number | null
  low: number | null
  as_of: string | null
}

export interface PropertyApi {
  source: 'attom' | 'fallback_state_median'
  property_value: number | null
  property_value_source_detail: PropertyValueSource
  market_value: number | null
  assessed_value: number | null
  avm: AvmDetail | null
  annual_taxes: number | null
  annual_taxes_estimated: boolean
  tax_year: number | null
  state_insurance_avg: number
  state_code: string
  year_built: number | null
  living_area_sqft: number | null
  beds: number | null
  baths: number | null
  property_type: string | null
  lot_sqft: number | null
  cached: boolean
  note?: string
}

export interface PropertyApiError {
  error: 'not_found' | 'unavailable' | 'rate_limited' | 'missing_params'
  message: string
}

export interface RatesApi {
  mortgage_30yr: number
  mortgage_source: 'freddie_mac' | 'fallback'
  mortgage_as_of: string
  prime_rate: number
  prime_source: 'fred' | 'fallback'
  prime_as_of: string
  fetched_at: string
}

export type Construction = 'existing' | 'new'

/** Format "{street}, {city}, {ST} {zip}" from a Nominatim suggestion. */
export function cleanAddress(s: GeocodeSuggestion): string {
  return [s.street, s.city, [s.state_code, s.postcode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}
