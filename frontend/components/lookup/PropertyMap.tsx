'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Continental US, zoomed out
const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]
const DEFAULT_ZOOM = 3.4
const SELECTED_ZOOM = 16
// Matches the light-theme --accent token; mapbox needs a literal colour.
const MARKER_COLOR = '#C2412D'

/** Mapbox map when NEXT_PUBLIC_MAPBOX_TOKEN is set; a quiet placeholder otherwise. */
export function PropertyMap({
  lat,
  lon,
  address,
  className = '',
}: {
  lat: number | null
  lon: number | null
  address?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return
    mapboxgl.accessToken = token
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      cooperativeGestures: true,
    })
    mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRef.current?.remove()
    markerRef.current = null
    if (lat != null && lon != null) {
      map.flyTo({ center: [lon, lat], zoom: SELECTED_ZOOM, duration: 1200, essential: true })
      const marker = new mapboxgl.Marker({ color: MARKER_COLOR }).setLngLat([lon, lat])
      if (address) marker.setPopup(new mapboxgl.Popup({ offset: 24, closeButton: false }).setText(address))
      markerRef.current = marker.addTo(map)
    } else {
      map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 700 })
    }
  }, [lat, lon, address])

  useEffect(() => () => {
    mapRef.current?.remove()
    mapRef.current = null
    markerRef.current = null
  }, [])

  const frame = `overflow-hidden rounded-2xl border border-line ${className}`

  if (!token) {
    return (
      <div className={`${frame} relative grid place-items-center bg-sunken p-6 text-center`} data-testid="map-placeholder">
        <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full text-line-strong" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 180 C80 150 120 200 200 170 S320 120 400 150" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M0 120 C90 100 150 140 230 110 S340 70 400 90" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M120 0 L150 240 M280 0 L250 240" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="relative space-y-2">
          <svg viewBox="0 0 24 24" className="mx-auto h-6 w-6 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <p className="text-sm text-ink-2">{address ?? 'Map preview'}</p>
          <p className="text-xs text-ink-3">Set NEXT_PUBLIC_MAPBOX_TOKEN to show the interactive map.</p>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} className={frame} />
}
