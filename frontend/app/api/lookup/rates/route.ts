import { NextResponse } from 'next/server'

const FALLBACK_MORTGAGE_RATE = 6.5
const FALLBACK_PRIME_RATE = 7.5
const CACHE_TTL_OK_MS = 24 * 60 * 60 * 1000   // 24h when both upstreams returned real data
const CACHE_TTL_FAIL_MS = 5 * 60 * 1000       // 5 min when anything fell back, so we retry soon

type RateResult = {
  mortgage_30yr: number
  mortgage_source: 'freddie_mac' | 'fallback'
  mortgage_as_of: string
  prime_rate: number
  prime_source: 'fred' | 'fallback'
  prime_as_of: string
  fetched_at: string
}

let cache: { value: RateResult; expires: number } | null = null

async function fetchFreddiePMMS(): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch('https://www.freddiemac.com/pmms/docs/PMMS_history.csv', {
      headers: { 'User-Agent': 'RBridge-property-lookup/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) {
      console.warn('[rates] Freddie Mac PMMS HTTP', res.status)
      return null
    }
    const text = await res.text()
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) return null

    const header = lines[0].split(',').map(s => s.trim())
    const dateIdx = header.findIndex(h => /date/i.test(h))
    const rateIdx = header.findIndex(h => /^pmms30$/i.test(h) || /30/.test(h))
    if (dateIdx < 0 || rateIdx < 0) return null

    for (let i = lines.length - 1; i > 0; i--) {
      const cols = lines[i].split(',')
      const rate = parseFloat(cols[rateIdx])
      if (!isNaN(rate) && rate > 0 && rate < 20) {
        return { rate, date: cols[dateIdx] }
      }
    }
    return null
  } catch (err) {
    console.warn('[rates] Freddie Mac PMMS error:', err instanceof Error ? err.message : err)
    return null
  }
}

// Try a list of URLs in order; first one that returns parseable CSV wins.
// Some Vercel edge regions hit weird TLS/redirect issues with the graph endpoint,
// so we also have a backup direct download URL.
const FRED_URLS = [
  'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPRIME',
  'https://fred.stlouisfed.org/series/DPRIME/downloaddata/DPRIME.csv',
]

async function fetchFredPrime(): Promise<{ rate: number; date: string } | null> {
  for (const url of FRED_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          // FRED sometimes returns empty body to default fetch UAs — be explicit.
          'User-Agent': 'Mozilla/5.0 (compatible; RBridge/1.0)',
          'Accept': 'text/csv,text/plain,*/*',
        },
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) {
        console.warn('[rates] FRED', url, 'HTTP', res.status)
        continue
      }
      const text = await res.text()
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) {
        console.warn('[rates] FRED', url, 'returned', lines.length, 'lines')
        continue
      }
      for (let i = lines.length - 1; i > 0; i--) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (cols.length < 2) continue
        const rate = parseFloat(cols[1])
        if (!isNaN(rate) && rate > 0 && rate < 25) {
          return { rate, date: cols[0] }
        }
      }
      console.warn('[rates] FRED', url, 'no usable row in', lines.length, 'lines')
    } catch (err) {
      console.warn('[rates] FRED', url, 'error:', err instanceof Error ? err.message : err)
    }
  }
  return null
}

export async function GET() {
  if (cache && cache.expires > Date.now()) {
    return NextResponse.json(cache.value)
  }

  const [mortgage, prime] = await Promise.all([fetchFreddiePMMS(), fetchFredPrime()])

  const today = new Date().toISOString().slice(0, 10)
  const mortgage_30yr = mortgage?.rate ?? FALLBACK_MORTGAGE_RATE
  const prime_rate = prime?.rate ?? FALLBACK_PRIME_RATE

  const result: RateResult = {
    mortgage_30yr,
    mortgage_source: mortgage ? 'freddie_mac' : 'fallback',
    mortgage_as_of: mortgage?.date ?? today,
    prime_rate,
    prime_source: prime ? 'fred' : 'fallback',
    prime_as_of: prime?.date ?? today,
    fetched_at: new Date().toISOString(),
  }

  // Short TTL when anything fell back, so the next request retries.
  const allLive = !!mortgage && !!prime
  cache = { value: result, expires: Date.now() + (allLive ? CACHE_TTL_OK_MS : CACHE_TTL_FAIL_MS) }
  return NextResponse.json(result)
}
