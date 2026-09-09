import { useState, useEffect } from 'react'
import { fetchGoabaseEvents } from '../api/backend.js'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png'

// Standardna plava ikonica
const defaultIcon = new L.Icon({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
})

// Highlighted narandžasta ikonica za pretražene objekte
const highlightIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: markerShadowPng,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
})

// Pomoćna komponenta za glatko pomeranje mape na prvu matches lokaciju
function MapFlyTo({ targetCoords }) {
    const map = useMap()
    useEffect(() => {
        if (targetCoords) {
            map.flyTo(targetCoords, 6, {
                duration: 1.5
            })
        }
    }, [targetCoords, map])
    return null
}

function GlobalMap() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [targetCoords, setTargetCoords] = useState(null)

    useEffect(() => {
        let isMounted = true;

        async function loadAllEvents() {
            setLoading(true)
            try {
                const rawData = await fetchGoabaseEvents(100)
                const parsedData = Array.isArray(rawData) ? rawData : []

                const readyEvents = parsedData
                    .map(event => {
                        const rawLat = event.lat || event.lat_party || event.latitude || event.geoLat || event.geo_lat;
                        const rawLon = event.lon || event.lon_party || event.longitude || event.geoLon || event.geo_lon;

                        if (rawLat && rawLon) {
                            const parsedLat = Number(rawLat);
                            const parsedLon = Number(rawLon);

                            if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
                                return {
                                    ...event,
                                    parsedLat,
                                    parsedLon
                                };
                            }
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (isMounted) {
                    setEvents(readyEvents)
                }
            } catch (err) {
                console.error("Error loading events for map:", err)
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        loadAllEvents()

        return () => {
            isMounted = false
        }
    }, [])

    // Provera da li event odgovara pretrazi
    const isMatch = (event) => {
        if (!searchTerm.trim()) return false
        const term = searchTerm.toLowerCase()
        return (
            event.nameCountry?.toLowerCase().includes(term) ||
            event.nameTown?.toLowerCase().includes(term) ||
            event.nameParty?.toLowerCase().includes(term)
        )
    }

    // Kada korisnik unese pojam za pretragu, nađemo prvu match lokaciju za flyTo
    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearchTerm(value)

        if (value.trim().length > 1) {
            const firstMatch = events.find(event => 
                event.nameCountry?.toLowerCase().includes(value.toLowerCase()) ||
                event.nameTown?.toLowerCase().includes(value.toLowerCase())
            )
            if (firstMatch) {
                setTargetCoords([firstMatch.parsedLat, firstMatch.parsedLon])
            }
        }
    }

    const matchedCount = events.filter(isMatch).length

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center ">
            {/* Header + Pretraga Bar */}
            <div className="w-full max-w-7xl mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-400">Global Psytrance Party Map</h1>
                    <span className="text-gray-400 text-sm">
                        Showing {events.length} mapped events worldwide
                    </span>
                </div>

                {/* Input za pretragu sa indikatorom poklapanja */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search country, town or event..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full bg-gray-800 text-white placeholder-gray-400 px-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-cyan-400 text-sm shadow-md"
                    />
                    {searchTerm && (
                        <span className="absolute right-3 top-2.5 text-xs text-orange-400 font-semibold bg-gray-900 px-2 py-0.5 rounded-full border border-orange-500/30">
                            {matchedCount} highlighted
                        </span>
                    )}
                </div>
            </div>

            {/* Mapa */}
            {loading ? (
                <div className="w-full max-w-7xl h-[75vh] bg-gray-800 rounded-xl flex items-center justify-center">
                    <p className="text-cyan-400 text-xl animate-pulse">Loading global party markers...</p>
                </div>
            ) : events.length === 0 ? (
                <div className="w-full max-w-7xl h-[75vh] bg-gray-800 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-xl">No valid coordinates found.</p>
                </div>
            ) : (
                <div className="w-full max-w-7xl h-[75vh] rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
                    <MapContainer 
                        center={[20, 0]} 
                        zoom={2} 
                        scrollWheelZoom={true} 
                        className="w-full h-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {/* Komponenta koja pomera kameru kada se unese država */}
                        <MapFlyTo targetCoords={targetCoords} />

                        {events.map(event => {
                            const highlighted = isMatch(event)
                            return (
                                <Marker 
                                    key={event.id} 
                                    position={[event.parsedLat, event.parsedLon]}
                                    icon={highlighted ? highlightIcon : defaultIcon}
                                    opacity={searchTerm.trim() ? (highlighted ? 1.0 : 0.4) : 1.0}
                                >
                                    <Popup>
                                        <div className="text-gray-900 max-w-xs text-center">
                                            {event.urlImageMedium && (
                                                <img 
                                                    src={event.urlImageMedium} 
                                                    alt={event.nameParty || 'Event'} 
                                                    className="w-full h-24 object-cover rounded mb-2" 
                                                />
                                            )}
                                            <h3 className="font-bold text-base mb-1">{event.nameParty}</h3>
                                            <p className="text-xs text-gray-600 mb-1">{event.nameTown}, <strong>{event.nameCountry}</strong></p>
                                            <p className="text-xs text-purple-700 font-semibold mb-2">{event.dateStart?.split('T')[0]}</p>
                                            <a 
                                                href={event.urlPartyHtml} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="inline-block bg-cyan-600 text-white text-xs px-3 py-1 rounded hover:bg-cyan-700"
                                            >
                                                View Details ↗
                                            </a>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        })}
                    </MapContainer>
                </div>
            )}
        </div>
    )
}

export default GlobalMap