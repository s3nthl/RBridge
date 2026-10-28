import type { ReactNode } from 'react'
import type { ChatMessage } from '@/types'

/** **bold** and *italic* → React nodes. No HTML injection: everything else is text. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

/** Paragraphs split on blank lines; blocks starting with "- " or "* " become bullet lists. */
function renderContent(raw: string): ReactNode[] {
  const text = raw.replace(/\[\d+\]/g, '').trim()
  return text.split(/\n{2,}/).map((block, b) => {
    const lines = block.split('\n').filter(l => l.trim())
    if (lines.length === 0) return null
    if (/^[-*]\s/.test(lines[0])) {
      return <ul key={b}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^[-*]\s+/, ''))}</li>)}</ul>
    }
    return (
      <p key={b}>
        {lines.map((l, i) => (
          <span key={i}>{i > 0 && <br />}{inline(l)}</span>
        ))}
      </p>
    )
  })
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div data-testid={`message-${message.role}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`chat-prose max-w-[85%] text-[15px] ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-ink px-4 py-3 text-paper'
            : 'rounded-2xl rounded-bl-md border border-line bg-surface px-5 py-4 text-ink'
        }`}
      >
        {renderContent(message.content)}
      </div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Analyst is typing">
      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-surface px-5 py-4">
        {[0, 200, 400].map(d => (
          <span key={d} className="dot-pulse h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}
