import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { DARK_TILES_URL, DARK_TILES_ATTRIBUTION, DARK_TILES_MAX_ZOOM } from './mapTiles.js'

import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png'

const customIcon = new L.Icon({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
})

function EventMap({ lat, lon, partyName, locationName }) {
    const [coords, setCoords] = useState(lat && lon ? [parseFloat(lat), parseFloat(lon)] : null)
    const [loading, setLoading] = useState(!coords)

    useEffect(() => {
        // Events without coordinates are looked up by town and country instead
        if (!lat || !lon) {
            async function geocodeLocation() {
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`
                    )
                    const data = await response.json()
                    if (data && data.length > 0) {
                        setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
                    }
                } catch (err) {
                    console.error("Geocoding failed:", err)
                } finally {
                    setLoading(false)
                }
            }
            geocodeLocation()
        }
    }, [lat, lon, locationName])

    if (loading) {
        return (
            <div className="map-frame w-full h-64 flex items-center justify-center mono text-xs muted">
                Finding the venue on the map...
            </div>
        )
    }

    if (!coords) {
        return (
            <div className="map-frame w-full h-64 flex items-center justify-center mono text-xs muted">
                Venue map unavailable
            </div>
        )
    }

    return (
        <div className="map-frame w-full h-64 overflow-hidden">
            <MapContainer
                center={coords}
                zoom={10}
                scrollWheelZoom={false}
                className="w-full h-full"
            >
                <TileLayer
                    attribution={DARK_TILES_ATTRIBUTION}
                    url={DARK_TILES_URL}
                    maxZoom={DARK_TILES_MAX_ZOOM}
                />
                <Marker position={coords} icon={customIcon}>
                    <Popup>
                        <strong>{partyName}</strong><br />
                        <span className="muted">{locationName}</span>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    )
}

export default EventMap