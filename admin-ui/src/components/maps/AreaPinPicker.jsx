import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import L from 'leaflet'
import { LayersControl, MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }
const MAX_PINS = 8
const USER_LOCATION_ZOOM = 19

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const toLatLng = (latlngLike) => {
  if (!latlngLike) return null
  if (typeof latlngLike.lat !== 'number' || typeof latlngLike.lng !== 'number') return null

  return {
    lat: Number(latlngLike.lat.toFixed(6)),
    lng: Number(latlngLike.lng.toFixed(6)),
  }
}

const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (event) => {
      const point = toLatLng(event.latlng)
      if (!point) return
      onMapClick(point)
    },
  })

  return null
}

const AreaPinPicker = ({ pins = [], onPinsChange, initialCenter = DEFAULT_CENTER }) => {
  const mapRef = useRef(null)
  const isMountedRef = useRef(true)
  const pendingFocusRef = useRef(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationStatus, setLocationStatus] = useState({ type: '', message: '' })

  const focusMapOnLocation = (location) => {
    if (!mapRef.current || !location) {
      pendingFocusRef.current = location
      return
    }

    mapRef.current.invalidateSize()
    mapRef.current.setView([location.lat, location.lng], USER_LOCATION_ZOOM, { animate: false })
    mapRef.current.setZoom(USER_LOCATION_ZOOM)
    pendingFocusRef.current = null
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const center = useMemo(() => {
    if (Array.isArray(pins) && pins.length > 0) {
      return pins[0]
    }
    return initialCenter
  }, [pins, initialCenter])

  const safePins = useMemo(
    () => (Array.isArray(pins) ? pins : []).filter((pin) => pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)),
    [pins],
  )

  const handleMapClick = (point) => {
    const nextPins = [...pins, point].slice(0, MAX_PINS)
    onPinsChange(nextPins)
  }

  const handleMarkerDragEnd = (event, index) => {
    const point = toLatLng(event.target.getLatLng())
    if (!point) return

    const nextPins = [...pins]
    nextPins[index] = point
    onPinsChange(nextPins)
  }

  const clearPins = () => {
    onPinsChange([])
  }

  const removeLastPin = () => {
    if (pins.length === 0) return
    onPinsChange(pins.slice(0, -1))
  }

  const requestCurrentLocation = () => {
    if (!navigator?.geolocation) {
      setLocationStatus({
        type: 'error',
        message: 'Geolocation is not supported in this browser.',
      })
      return
    }

    setIsLocating(true)
    setLocationStatus({ type: 'info', message: 'Requesting location permission...' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return

        const accuracy = Math.round(position.coords.accuracy || 0)
        const location = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }

        setUserLocation(location)
        focusMapOnLocation(location)
        if (accuracy > 0 && accuracy > 200) {
          setLocationStatus({
            type: 'warning',
            message: `Location centered, but accuracy is low (±${accuracy}m).`,
          })
        } else {
          setLocationStatus({
            type: 'success',
            message: accuracy > 0 ? `Centered to your location (±${accuracy}m).` : 'Centered to your location.',
          })
        }
        setIsLocating(false)
      },
      (error) => {
        if (!isMountedRef.current) return

        let message = 'Could not fetch your location.'
        if (error?.code === 1) {
          message = 'Location permission denied. Please allow location access in browser settings.'
        } else if (error?.code === 2) {
          message = 'Location unavailable right now. Try again in a few seconds.'
        } else if (error?.code === 3) {
          message = 'Location request timed out. Please try again.'
        }

        setLocationStatus({ type: 'error', message })
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  useEffect(() => {
    requestCurrentLocation()
  }, [])

  useEffect(() => {
    if (userLocation) {
      focusMapOnLocation(userLocation)
    }
  }, [userLocation])

  return (
    <div>
      <div className="gmaps" style={{ position: 'relative', overflow: 'hidden', height: 320 }}>
        <MapContainer
          zoom={pins.length > 0 ? 14 : 5}
          center={center}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance
            if (pendingFocusRef.current) {
              focusMapOnLocation(pendingFocusRef.current)
            }
          }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <ClickHandler onMapClick={handleMapClick} />

          {userLocation && <Marker position={userLocation} icon={markerIcon} />}

          {safePins.map((pin, index) => (
            <Marker
              key={`${pin.lat}-${pin.lng}-${index}`}
              position={pin}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (event) => handleMarkerDragEnd(event, index),
              }}
            />
          ))}

          {safePins.length >= 3 && (
            <Polygon positions={safePins} strokeColor="#2563eb" strokeOpacity={0.9} strokeWeight={2} fillColor="#60a5fa" fillOpacity={0.2} />
          )}
        </MapContainer>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-2">
        <Button type="button" size="sm" variant="soft-success" onClick={requestCurrentLocation} disabled={isLocating}>
          {isLocating ? 'Locating...' : 'Use My Location'}
        </Button>
        <Button type="button" size="sm" variant="soft-primary" onClick={removeLastPin} disabled={pins.length === 0}>
          Undo Last Pin
        </Button>
        <Button type="button" size="sm" variant="soft-danger" onClick={clearPins} disabled={pins.length === 0}>
          Clear Pins
        </Button>
      </div>

      <small className="text-muted d-block mt-2">
        Satellite view is enabled by default. Click Use My Location to grant permission and zoom in, then place pins.
      </small>

      {locationStatus.message && (
        <div
          className={`mt-2 small ${
            locationStatus.type === 'error'
              ? 'text-danger'
              : locationStatus.type === 'warning'
                ? 'text-warning'
                : locationStatus.type === 'success'
                  ? 'text-success'
                  : 'text-muted'
          }`}>
          {locationStatus.message}
        </div>
      )}
    </div>
  )
}

export default AreaPinPicker
