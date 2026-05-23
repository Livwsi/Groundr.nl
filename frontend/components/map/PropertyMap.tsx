'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Property {
  id:            number
  street:        string
  house_number:  string
  city:          string
  latitude:      number
  longitude:     number
  woz_value:     number | null
  area_m2:       number | null
  property_type: string
}

interface Props {
  properties: Property[]
  onSelect?:  (property: Property) => void
  center?:    [number, number]
  zoom?:      number
}

export default function PropertyMap({
  properties,
  onSelect,
  center = [5.4697, 51.4416],
  zoom   = 12,
}: Props) {

  const mapContainer = useRef<HTMLDivElement>(null)
  const map          = useRef<mapboxgl.Map | null>(null)
  const markers      = useRef<mapboxgl.Marker[]>([])
  const popups       = useRef<mapboxgl.Popup[]>([])
  const [mapLoaded,  setMapLoaded] = useState(false)

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return
  mapboxgl.accessToken = MAPBOX_TOKEN
  map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:     'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom,
      pitch:     45,       // tilt the map for 3D effect
      bearing:   -15,      // slight rotation
    })

  map.current.on('load', () => {
      setMapLoaded(true)

      map.current!.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        'top-right'
      )

      // Add 3D buildings layer
      map.current!.addLayer({
        id:     '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type:   'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color':   '#d4e8d4',
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'min_height'],
          'fill-extrusion-opacity': 0.8,
        },
      })
    })

    return () => {
      markers.current.forEach(m => m.remove())
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add markers when map loads or properties change
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    // Clean up existing markers and popups
    markers.current.forEach(m => m.remove())
    popups.current.forEach(p => p.remove())
    markers.current = []
    popups.current  = []

    properties.forEach(prop => {
      if (!prop.latitude || !prop.longitude) return

      // Create popup
      const popup = new mapboxgl.Popup({
        offset:      [0, -20],
        closeButton: true,
        closeOnClick: false,
        className:   'groundr-popup',
        maxWidth:    '200px',
      }).setHTML(`
        <div style="background:#0e3b28;border:1px solid #165c3e;padding:12px 14px;border-radius:4px;min-width:180px;">
          <div style="color:white;font-weight:600;font-size:13px;margin-bottom:2px;">
            ${prop.street} ${prop.house_number}
          </div>
          <div style="color:rgba(113,221,175,0.6);font-size:11px;margin-bottom:8px;">
            ${prop.city}
          </div>
          ${prop.area_m2 ? `<div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:8px;">${prop.area_m2} m²</div>` : ''}
          <button
            onclick="window.location.href='/property/${prop.id}'"
            style="background:#2fc586;color:#061a11;border:none;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;width:100%;"
          >
            Bekijk woning →
          </button>
        </div>
      `)

      // Create marker element
      const el = document.createElement('div')
      el.style.cssText = `
        width: 28px;
        height: 28px;
        background: #2fc586;
        border: 2.5px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      `

      el.addEventListener('mouseenter', () => {
        el.style.background = '#71ddaf'
      })
      el.addEventListener('mouseleave', () => {
        el.style.background = '#2fc586'
      })

      // Single click handler — show popup + call onSelect
      el.addEventListener('click', (e) => {
        e.stopPropagation()

        // Close all other popups
        popups.current.forEach(p => p.remove())

        // Show this popup
        popup
          .setLngLat([prop.longitude, prop.latitude])
          .addTo(map.current!)

      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([prop.longitude, prop.latitude])
        .addTo(map.current!)

      markers.current.push(marker)
      popups.current.push(popup)
    })

    // Fit map to all markers
    if (properties.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      properties.forEach(p => {
        if (p.latitude && p.longitude) bounds.extend([p.longitude, p.latitude])
      })
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 13 })
    }

  }, [mapLoaded, properties])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {mapLoaded && properties.length > 0 && (
        <div
          className="absolute bottom-4 left-4 px-3 py-1.5 text-xs font-semibold"
          style={{
            background:     'rgba(14,59,40,0.9)',
            border:         '1px solid rgba(47,197,134,0.3)',
            color:          '#2fc586',
            backdropFilter: 'blur(8px)',
          }}
        >
          {properties.length} woningen
        </div>
      )}
    </div>
  )
}