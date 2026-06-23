'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { translations } from '@/lib/translations'
import { useAppStore } from '@/lib/store'

interface MapProps {
  shopLocation: [number, number]
  buyerLocation: [number, number]
  shopName?: string
  buyerName?: string
}

export default function ShipperMapModal({ shopLocation, buyerLocation, shopName = 'Cửa hàng', buyerName = 'Người mua' }: MapProps) {
  const { language } = useAppStore()
  const t = translations[language]

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const shipperMarkerRef = useRef<any>(null)
  const routeLineRef = useRef<any>(null)
  
  const [shipperLocation, setShipperLocation] = useState<[number, number]>(shopLocation)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let L: any
    
    const initMap = async () => {
      L = await import('leaflet')
      
      // Fix Leaflet marker icons in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      })

      if (mapRef.current) return

      const map = L.map(mapContainerRef.current).setView(shopLocation, 14)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      // Add shop marker
      const shopIcon = L.divIcon({
        html: '<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">🏪</div>',
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker(shopLocation, { icon: shopIcon }).addTo(map).bindPopup(`🏪 ${shopName}`).openPopup()

      // Add buyer marker
      const buyerIcon = L.divIcon({
        html: '<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">👤</div>',
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      L.marker(buyerLocation, { icon: buyerIcon }).addTo(map).bindPopup(`👤 ${buyerName}`)

      // Add polyline path
      routeLineRef.current = L.polyline([shopLocation, buyerLocation], {
        color: '#16a34a',
        weight: 4,
        opacity: 0.7,
        dashArray: '5, 10',
      }).addTo(map)

      // Add shipper marker
      const shipperIcon = L.divIcon({
        html: '<div style="font-size: 28px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.3));">🏍️</div>',
        className: 'custom-div-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const shipperMarker = L.marker(shopLocation, { icon: shipperIcon }).addTo(map).bindPopup(t.shipper_moving)
      shipperMarkerRef.current = shipperMarker

      // Fit bounds
      map.fitBounds(L.latLngBounds([shopLocation, buyerLocation]), {
        padding: [50, 50],
      })
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [shopLocation, buyerLocation, shopName, buyerName, t.shipper_moving])

  // Animation simulator
  const startSimulation = async () => {
    if (isAnimating) return
    setIsAnimating(true)

    const start = performance.now()
    const duration = 6000 // 6 seconds delivery simulation

    const animate = (time: number) => {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)

      const lat = shopLocation[0] + (buyerLocation[0] - shopLocation[0]) * progress
      const lng = shopLocation[1] + (buyerLocation[1] - shopLocation[1]) * progress
      const currentPos: [number, number] = [lat, lng]

      setShipperLocation(currentPos)

      if (shipperMarkerRef.current) {
        shipperMarkerRef.current.setLatLng(currentPos)
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        if (shipperMarkerRef.current) {
          shipperMarkerRef.current.bindPopup(`🎉 ${t.shipper_delivered_success}`).openPopup()
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  const resetSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setIsAnimating(false)
    setShipperLocation(shopLocation)
    if (shipperMarkerRef.current) {
      shipperMarkerRef.current.setLatLng(shopLocation).bindPopup(t.shipper_moving).openPopup()
    }
  }

  return (
    <div className="space-y-4">
      <div 
        ref={mapContainerRef} 
        style={{ height: '350px', width: '100%', borderRadius: '16px' }} 
        className="border shadow-md overflow-hidden relative"
      />
      <div className="flex gap-3 justify-center">
        <Button 
          onClick={startSimulation} 
          disabled={isAnimating}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md px-6 transition-all"
        >
          {isAnimating ? `${t.shipper_moving}` : `🏍️ ${language === 'vi' ? 'Bắt đầu di chuyển' : 'Start delivery'}`}
        </Button>
        <Button 
          onClick={resetSimulation} 
          variant="outline"
          className="font-semibold border-2"
        >
          {language === 'vi' ? 'Đặt lại' : 'Reset'}
        </Button>
      </div>
    </div>
  )
}
