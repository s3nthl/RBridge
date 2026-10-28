'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { BridgeMark } from '@/components/ui/Logo'
import { getChatHistory, getSuggestions, sendChatMessage } from '@/lib/api'
import type { ChatMessage } from '@/types'
import { ChatBubble, TypingBubble } from './ChatBubble'

const MAX_LENGTH = 2000

function localMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content, created_at: new Date().toISOString() }
}

export default function ChatShell({ token, borrowerRef }: { token: string; borrowerRef: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [closed, setClosed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getChatHistory(token), getSuggestions(token)]).then(([history, sugg]) => {
      if (cancelled) return
      if (history.success && history.data) setMessages(history.data.messages)
      if (sugg.success && sugg.data) setSuggestions(sugg.data.suggestions)
    })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setInput('')
    setMessages(prev => [...prev, localMessage('user', content)])

    const res = await sendChatMessage(token, content)
    if (res.success && res.data) {
      const reply = res.data
      setMessages(prev => [...prev, reply])
    } else if (res.errors[0]?.code === 'HTTP_410') {
      setClosed(true)
    } else {
      setMessages(prev => [...prev, localMessage('assistant', res.errors[0]?.message ?? 'Something went wrong. Please try again.')])
    }
    setSending(false)
  }

  async function endSession() {
    // Closing makes both the result and chat links stop working.
    await fetch(`/api/proxy/api/v1/transactions/${encodeURIComponent(token)}/close`, { method: 'POST' }).catch(() => null)
    setClosed(true)
  }

  if (closed) {
    return <SessionClosed />
  }

  const empty = messages.length === 0

  return (
    <div className="flex min-h-[70vh] flex-col rounded-2xl border border-line bg-paper">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <p className="text-sm text-ink-2">
          Analyst chat · <span className="num text-ink">#{borrowerRef}</span>
        </p>
        <button type="button" onClick={endSession} className="text-sm text-ink-3 hover:text-bad">
          End session
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6" aria-live="polite">
        {empty && (
          <div className="mx-auto max-w-md py-8 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-ink">
              <BridgeMark />
            </span>
            <p className="font-display text-2xl text-ink">Ask about this scenario</p>
            <p className="mt-2 text-sm text-ink-2">
              The analyst explains the numbers in this result. It does not make lending or eligibility decisions.
            </p>
          </div>
        )}
        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        {sending && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      {suggestions.length > 0 && empty && (
        <div className="flex flex-wrap gap-2 px-5 pb-3" data-testid="suggestions">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-sm text-ink-2 transition-colors hover:border-accent hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        className="flex items-end gap-3 border-t border-line p-4"
      >
        <label htmlFor="chat-input" className="sr-only">Your question</label>
        <textarea
          id="chat-input"
          rows={1}
          value={input}
          maxLength={MAX_LENGTH}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
          }}
          placeholder="Ask about the relief, the balance, or the exit options…"
          className="max-h-40 min-h-11 flex-1 resize-y rounded-xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
        <Button type="submit" disabled={sending || !input.trim()} data-testid="chat-send">Send</Button>
      </form>
    </div>
  )
}

export function SessionClosed() {
  return (
    <div data-testid="session-closed" className="mx-auto max-w-md py-24 text-center">
      <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-full bg-good-soft text-good" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4.5 10.5 8 14l7.5-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="font-display text-4xl text-ink">Session closed</p>
      <p className="mt-3 text-ink-2">This analysis session has ended or the link is no longer valid. The loan officer will follow up directly.</p>
    </div>
  )
}
