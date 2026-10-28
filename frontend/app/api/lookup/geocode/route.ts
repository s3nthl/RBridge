import { NextRequest, NextResponse } from 'next/server'

type GeocodeSuggestion = {
  display_name: string
  lat: string
  lon: string
  street: string | null      // house_number + road combined, ready for ATTOM address1
  city: string | null
  state: string | null
  state_code: string | null
  postcode: string | null
  country: string | null
}

type NominatimAddress = {
  house_number?: string
  road?: string
  city?: string
  town?: string
  village?: string
  hamlet?: string
  suburb?: string
  county?: string
  state?: string
  'ISO3166-2-lvl4'?: string
  postcode?: string
  country?: string
  country_code?: string
}

type NominatimResult = {
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'us')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim's usage policy requires identifying the app
        'User-Agent': 'RBridge-property-lookup/1.0',
        'Accept-Language': 'en-US',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ suggestions: [], error: 'geocode_unavailable' }, { status: 502 })
    }
    const data = (await res.json()) as NominatimResult[]
    const suggestions: GeocodeSuggestion[] = data.map((r) => {
      const a = r.address ?? {}
      const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.suburb ?? null
      const stateCode = a['ISO3166-2-lvl4']?.split('-')[1] ?? null
      const street = [a.house_number, a.road].filter(Boolean).join(' ') || null
      return {
        display_name: r.display_name,
        lat: r.lat,
        lon: r.lon,
        street,
        city,
        state: a.state ?? null,
        state_code: stateCode,
        postcode: a.postcode ?? null,
        country: a.country ?? null,
      }
    })
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [], error: 'geocode_failed' }, { status: 502 })
  }
}
