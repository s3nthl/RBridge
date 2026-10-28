import { NextRequest, NextResponse } from 'next/server'
import { getStateInfo, resolveStateCode } from '@/lib/lookup/state-data'

// ATTOM Data property lookup.
//
// Calls both endpoints in parallel:
//   1. /propertyapi/v1.0.0/assessment/detail
//      → assessed value, market value, tax amount, property characteristics
//   2. /propertyapi/v1.0.0/avm/detail
//      → ATTOM Automated Valuation Model (current market estimate + range + date)
//
// Display value priority: AVM (closest to today's market) → market value
// → assessed value → state median (only when all ATTOM data missing).
// Insurance is scaled to AVM value (more relevant than tax-roll assessed).
//
// Quirk: ATTOM returns HTTP 400 with msg="SuccessWithoutResult" when an address
// is not in their dataset. That is a not-found case, not an error.

type AttomProperty = {
  summary?: {
    proptype?: string
    propertyType?: string
    yearbuilt?: number
  }
  assessment?: {
    assessed?: { assdttlvalue?: number }
    market?: { mktttlvalue?: number }
    tax?: { taxamt?: number; taxyear?: number }
  } | null
  avm?: {
    amount?: { value?: number; high?: number; low?: number; scr?: number }
    eventDate?: string
  }
  building?: {
    summary?: { yearbuilteffective?: number }
    size?: { livingsize?: number; bldgsize?: number }
    rooms?: { beds?: number; bathstotal?: number; bathsfull?: number; bathspartial?: number }
  }
  lot?: {
    lotsize1?: number    // acres
    lotsize2?: number    // sqft
  }
}

export type PropertyValueSource =
  | 'attom_avm'           // ATTOM AVM (current market estimate) — preferred
  | 'attom_market'        // ATTOM assessment.market.mktttlvalue
  | 'attom_assessed'      // ATTOM assessment.assessed.assdttlvalue
  | 'state_median'        // pure state-level fallback

export type AvmDetail = {
  value: number
  high: number | null
  low: number | null
  as_of: string | null
}

export type PropertyLookupResponse = {
  source: 'attom' | 'fallback_state_median'
  property_value: number | null            // the chosen value used for downstream calc
  property_value_source_detail: PropertyValueSource
  market_value: number | null              // assessment.market.mktttlvalue
  assessed_value: number | null            // assessment.assessed.assdttlvalue
  avm: AvmDetail | null                    // full AVM detail when available
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

const NATIONAL_AVG_TAX_RATE = 0.011
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const propertyCache = new Map<string, { value: PropertyLookupResponse; expires: number }>()

function normalizeKey(street: string, city: string, state: string, zip: string) {
  return `${street}|${city}|${state}|${zip}`.toLowerCase().replace(/\s+/g, ' ').trim()
}

async function fetchAttom(
  endpoint: 'assessment/detail' | 'avm/detail',
  street: string,
  city: string,
  stateCode: string,
  zip: string,
  apiKey: string,
): Promise<{ status: number; payload: { property?: AttomProperty[]; status?: { msg?: string; code?: number } } | null }> {
  const url = new URL(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/${endpoint}`)
  url.searchParams.set('address1', street)
  url.searchParams.set('address2', `${city}, ${stateCode}${zip ? ' ' + zip : ''}`)
  try {
    const res = await fetch(url.toString(), {
      headers: { apikey: apiKey, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    const payload = await res.json().catch(() => null)
    return { status: res.status, payload }
  } catch {
    return { status: 0, payload: null }
  }
}

export async function GET(req: NextRequest) {
  const street = req.nextUrl.searchParams.get('street')?.trim()
  const city = req.nextUrl.searchParams.get('city')?.trim()
  const stateRaw = req.nextUrl.searchParams.get('state')?.trim()
  const zip = req.nextUrl.searchParams.get('zip')?.trim() ?? ''
  const stateCode = resolveStateCode(stateRaw)
  const stateInfo = getStateInfo(stateRaw)

  if (!street || !city || !stateCode) {
    return NextResponse.json(
      { error: 'missing_params', message: 'street, city, and 2-letter state are required' },
      { status: 400 },
    )
  }

  const cacheKey = normalizeKey(street, city, stateCode, zip)
  const cached = propertyCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ ...cached.value, cached: true })
  }

  const fallback = (note: string): PropertyLookupResponse => ({
    source: 'fallback_state_median',
    property_value: stateInfo.median_value,
    property_value_source_detail: 'state_median',
    market_value: null,
    assessed_value: null,
    avm: null,
    annual_taxes: Math.round(stateInfo.median_value * NATIONAL_AVG_TAX_RATE),
    annual_taxes_estimated: true,
    tax_year: null,
    state_insurance_avg: stateInfo.insurance_avg,
    state_code: stateCode,
    year_built: null,
    living_area_sqft: null,
    beds: null,
    baths: null,
    property_type: null,
    lot_sqft: null,
    cached: false,
    note,
  })

  const apiKey = process.env.ATTOM_API_KEY
  if (!apiKey) {
    return NextResponse.json(fallback('ATTOM_API_KEY not configured; using state-level estimates'))
  }

  // Both ATTOM calls in parallel — total latency is max(assessment, avm), not sum.
  const [assessmentRes, avmRes] = await Promise.all([
    fetchAttom('assessment/detail', street, city, stateCode, zip, apiKey),
    fetchAttom('avm/detail', street, city, stateCode, zip, apiKey),
  ])

  // Auth / rate-limit handling (assessment is primary; mirror its status)
  if (assessmentRes.status === 401) {
    return NextResponse.json({ error: 'unavailable', message: 'Data service unavailable' }, { status: 503 })
  }
  if (assessmentRes.status === 429) {
    return NextResponse.json({ error: 'rate_limited', message: 'Too many requests — try again in a moment' }, { status: 429 })
  }

  const assessmentMsg = assessmentRes.payload?.status?.msg
  const avmMsg = avmRes.payload?.status?.msg
  const assessmentProp = assessmentRes.payload?.property?.[0]
  const avmProp = avmRes.payload?.property?.[0]

  // Both endpoints say "not in dataset" → genuine 404
  const assessmentNotFound = assessmentMsg === 'SuccessWithoutResult' || !assessmentProp
  const avmNotFound = avmMsg === 'SuccessWithoutResult' || !avmProp
  if (assessmentNotFound && avmNotFound) {
    return NextResponse.json(
      { error: 'not_found', message: 'Property not found — try a different address format' },
      { status: 404 },
    )
  }

  // Pick the richer record as the source of building/lot characteristics.
  // AVM responses also include summary/building/lot blocks for matched properties.
  const prop = assessmentProp ?? avmProp ?? {}

  // Lot
  const lotAcres = prop.lot?.lotsize1
  const lotSqftDirect = prop.lot?.lotsize2
  const lotSqft =
    typeof lotSqftDirect === 'number' && lotSqftDirect > 0 ? lotSqftDirect :
    typeof lotAcres === 'number' && lotAcres > 0 ? Math.round(lotAcres * 43560) :
    null

  // Value sources
  const attomAssessed = assessmentProp?.assessment?.assessed?.assdttlvalue
  const attomMarket = assessmentProp?.assessment?.market?.mktttlvalue
  const attomTax = assessmentProp?.assessment?.tax?.taxamt
  const attomTaxYear = assessmentProp?.assessment?.tax?.taxyear ?? null
  const hasAssessed = typeof attomAssessed === 'number' && attomAssessed > 0
  const hasMarket = typeof attomMarket === 'number' && attomMarket > 0
  const hasTax = typeof attomTax === 'number' && attomTax > 0

  const avmAmount = avmProp?.avm?.amount?.value
  const hasAvm = typeof avmAmount === 'number' && avmAmount > 0
  const avmDetail: AvmDetail | null = hasAvm
    ? {
        value: avmAmount!,
        high: typeof avmProp!.avm!.amount!.high === 'number' ? avmProp!.avm!.amount!.high! : null,
        low: typeof avmProp!.avm!.amount!.low === 'number' ? avmProp!.avm!.amount!.low! : null,
        as_of: avmProp!.avm!.eventDate ?? null,
      }
    : null

  // AVM is preferred (current market estimate), then market value, then assessed, then state median
  let propertyValue: number
  let valueSource: PropertyValueSource
  if (hasAvm) {
    propertyValue = avmAmount!
    valueSource = 'attom_avm'
  } else if (hasMarket) {
    propertyValue = attomMarket!
    valueSource = 'attom_market'
  } else if (hasAssessed) {
    propertyValue = attomAssessed!
    valueSource = 'attom_assessed'
  } else {
    propertyValue = stateInfo.median_value
    valueSource = 'state_median'
  }

  const annualTaxes = hasTax
    ? Math.round(attomTax!)
    : Math.round(propertyValue * NATIONAL_AVG_TAX_RATE)

  const response: PropertyLookupResponse = {
    source: 'attom',
    property_value: propertyValue,
    property_value_source_detail: valueSource,
    market_value: hasMarket ? attomMarket! : null,
    assessed_value: hasAssessed ? attomAssessed! : null,
    avm: avmDetail,
    annual_taxes: annualTaxes,
    annual_taxes_estimated: !hasTax,
    tax_year: attomTaxYear,
    state_insurance_avg: stateInfo.insurance_avg,
    state_code: stateCode,
    year_built: prop.summary?.yearbuilt ?? prop.building?.summary?.yearbuilteffective ?? null,
    living_area_sqft: prop.building?.size?.livingsize ?? prop.building?.size?.bldgsize ?? null,
    beds: prop.building?.rooms?.beds ?? null,
    baths: prop.building?.rooms?.bathstotal ?? null,
    property_type: prop.summary?.propertyType ?? prop.summary?.proptype ?? null,
    lot_sqft: lotSqft,
    cached: false,
    note:
      valueSource === 'state_median' ? 'No ATTOM value or AVM available — using state median' :
      undefined,
  }

  propertyCache.set(cacheKey, { value: response, expires: Date.now() + CACHE_TTL_MS })
  return NextResponse.json(response)
}
