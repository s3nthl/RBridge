import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000'

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  req.headers.forEach((v, k) => {
    if (!['host', 'connection'].includes(k)) headers.set(k, v)
  })

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
  } as RequestInit)

  // fetch already decompressed the body, so the upstream encoding/length headers no longer
  // describe it. Forwarding them makes browsers fail to decode gzipped Railway responses.
  const outHeaders = new Headers(res.headers)
  for (const h of ['content-encoding', 'content-length', 'transfer-encoding']) outHeaders.delete(h)

  const out = new NextResponse(res.body, {
    status: res.status,
    headers: outHeaders,
  })
  return out
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
