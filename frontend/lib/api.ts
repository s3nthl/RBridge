import type {
  ApiEnvelope,
  CalculateData,
  ChatHistoryData,
  ChatMessage,
  InitiateData,
  ScenarioInput,
  SuggestionsData,
  TransactionData,
  UnderwritingProfile,
} from '@/types'

// Browser calls go through the Next.js proxy route so the backend URL never
// reaches the client and CORS never bites. Server components call BACKEND_URL.
const BROWSER_BASE = '/api/proxy/api/v1'
const SERVER_BASE = `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/api/v1`

export const DEMO_TENANT = 'demo-cu'

export const NETWORK_ERROR = {
  code: 'NETWORK_ERROR',
  field: null,
  message: 'Could not reach the RBridge service. Check your connection and try again.',
}

async function request<T>(path: string, init?: RequestInit, base = BROWSER_BASE): Promise<ApiEnvelope<T>> {
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!res.ok && res.headers.get('content-type')?.includes('application/json') !== true) {
      throw new Error(`HTTP ${res.status}`)
    }
    const body = await res.json()
    // FastAPI HTTPException bodies are { detail } rather than an envelope.
    if (!res.ok && 'detail' in body) {
      return {
        success: false,
        data: null,
        meta: { request_id: '', calc_version: '', tenant_id: '', timestamp: '' },
        errors: [{ code: `HTTP_${res.status}`, field: null, message: String(body.detail) }],
      }
    }
    return body as ApiEnvelope<T>
  } catch {
    return {
      success: false,
      data: null,
      meta: { request_id: '', calc_version: '', tenant_id: '', timestamp: '' },
      errors: [NETWORK_ERROR],
    }
  }
}

export function calculate(scenario: ScenarioInput, signal?: AbortSignal) {
  return request<CalculateData>('/calculate', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: DEMO_TENANT, scenario }),
    signal,
  })
}

export function initiate(args: {
  borrower_ref: string
  scenario: ScenarioInput
  borrower: UnderwritingProfile
  lo_email?: string
}) {
  return request<InitiateData>('/transactions/initiate', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: DEMO_TENANT, ...args }),
  })
}

/** Server-side only: used by /results/[token] and /chat/[token]. */
export function fetchTransaction(token: string) {
  return request<TransactionData>(
    `/transactions/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
    SERVER_BASE,
  )
}

export function getChatHistory(token: string) {
  return request<ChatHistoryData>(`/chat/${encodeURIComponent(token)}/messages`)
}

export function sendChatMessage(token: string, content: string) {
  return request<ChatMessage>(`/chat/${encodeURIComponent(token)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function getSuggestions(token: string) {
  return request<SuggestionsData>(`/chat/${encodeURIComponent(token)}/suggestions`)
}
