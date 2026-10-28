'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

const THEME_EVENT = 'rbridge-theme-change'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function currentTheme(): Theme {
  const stamped = document.documentElement.getAttribute('data-theme')
  if (stamped === 'light' || stamped === 'dark') return stamped
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  window.addEventListener(THEME_EVENT, onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener(THEME_EVENT, onChange)
  }
}

export default function ThemeToggle() {
  // null on the server so the first client render matches the HTML.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null)

  function toggle() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be blocked; the toggle still works for this page view.
    }
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
