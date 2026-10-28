'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cleanAddress, type GeocodeSuggestion } from './types'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

/** Address autocomplete (ARIA combobox) backed by /api/lookup/geocode. */
export function AddressSearch({
  onSelect,
  disabled,
}: {
  onSelect: (s: GeocodeSuggestion) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Picking a suggestion rewrites the query; skip the search that would trigger.
  const skipNextSearch = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    if (query.trim().length < MIN_QUERY_LENGTH) return
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await fetch(`/api/lookup/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const data = (await res.json()) as { suggestions?: GeocodeSuggestion[] }
        setFailed(!res.ok)
        setSuggestions(data.suggestions ?? [])
        setOpen(true)
        setHighlight(0)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setFailed(true)
          setSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function onQueryChange(value: string) {
    setQuery(value)
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setOpen(false)
    }
  }

  function pick(s: GeocodeSuggestion) {
    skipNextSearch.current = true
    setQuery(cleanAddress(s) || s.display_name)
    setOpen(false)
    onSelect(s)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && (suggestions.length > 0 || failed)

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">Property address</label>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 transition-colors focus-within:border-accent">
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && suggestions.length > 0 ? `${listId}-opt-${highlight}` : undefined}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Start typing a US address…"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-w-0 bg-transparent py-4 text-base text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
        />
        {loading && (
          <span className="flex shrink-0 gap-1" aria-label="Searching">
            {[0, 1, 2].map(i => (
              <span key={i} className="dot-pulse h-1.5 w-1.5 rounded-full bg-ink-3" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </span>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-card"
        >
          {failed && suggestions.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-2">Address search is unavailable right now. Try again shortly.</li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={`${s.lat}-${s.lon}-${i}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm leading-snug ${
                  i === highlight ? 'bg-sunken text-ink' : 'text-ink-2'
                }`}
              >
                <span className="block font-medium text-ink">{cleanAddress(s) || s.display_name}</span>
                <span className="block truncate text-xs text-ink-3">{s.display_name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
