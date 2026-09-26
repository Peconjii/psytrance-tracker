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
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center rounded-xl text-cyan-400">
                Finding location on map...
            </div>
        )
    }

    if (!coords) {
        return (
            <div className="w-full h-64 bg-gray-800 flex items-center justify-center rounded-xl text-gray-400">
                Location map unavailable
            </div>
        )
    }

    return (
        <div className="w-full h-64 rounded-xl overflow-hidden shadow-lg my-2">
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
                        <strong className="text-gray-900">{partyName}</strong><br />
                        <span className="text-gray-600">{locationName}</span>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    )
}

export default EventMap