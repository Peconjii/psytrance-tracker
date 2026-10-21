import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchMapEvents } from '../api/backend.js'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { eventPin, matchPin } from '../components/mapPins.js'
import { DARK_TILES_URL, DARK_TILES_ATTRIBUTION, DARK_TILES_MAX_ZOOM } from '../components/mapTiles.js'

import usePageMeta from '../hooks/usePageMeta.js'

// Leaflet's map object is only reachable from a child of MapContainer, hence this tiny component
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
    usePageMeta({
        title: 'Psytrance Events Map',
        description: 'Every upcoming psytrance festival and party on a world map. Find psytrance events near you.',
        path: '/map',
    })
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [targetCoords, setTargetCoords] = useState(null)

    useEffect(() => {
        let isMounted = true;

        async function loadAllEvents() {
            setLoading(true)
            try {
                // Backend only sends events that have coordinates, so no parsing needed here
                const readyEvents = await fetchMapEvents()

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

    const isMatch = (event) => {
        if (!searchTerm.trim()) return false
        const term = searchTerm.toLowerCase()
        return (
            event.nameCountry?.toLowerCase().includes(term) ||
            event.nameTown?.toLowerCase().includes(term) ||
            event.nameParty?.toLowerCase().includes(term)
        )
    }

    // Fly the map to the first town or country that matches the search
    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearchTerm(value)

        if (value.trim().length > 1) {
            const firstMatch = events.find(event => 
                event.nameCountry?.toLowerCase().includes(value.toLowerCase()) ||
                event.nameTown?.toLowerCase().includes(value.toLowerCase())
            )
            if (firstMatch) {
                setTargetCoords([firstMatch.lat, firstMatch.lon])
            }
        }
    }

    const matchedCount = events.filter(isMatch).length

    return (
        <div className="page page--wide">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <header className="page-head m-0">
                    <div className="page-head__tag">// Earth · coordinates</div>
                    <h1 className="page-title">World map</h1>
                    <p className="page-head__sub">{events.length} upcoming events with a known location.</p>
                </header>

                <div className="w-full md:w-96">
                    <label htmlFor="map-search" className="field-label">
                        Find a place {searchTerm && <span className="text-[var(--goa)]">· {matchedCount} highlighted</span>}
                    </label>
                    <input
                        id="map-search"
                        type="text"
                        placeholder="Country, town or event..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="field"
                    />
                </div>
            </div>

            {loading ? (
                <div className="map-frame h-[70vh] flex items-center justify-center mono text-xs muted tracking-widest">
                    LOADING EVENT COORDINATES...
                </div>
            ) : events.length === 0 ? (
                <div className="map-frame h-[70vh] flex items-center justify-center muted">
                    No events with coordinates right now.
                </div>
            ) : (
                <div className="map-frame h-[70vh] overflow-hidden relative">
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        scrollWheelZoom={true}
                        className="w-full h-full"
                    >
                        <TileLayer
                            attribution={DARK_TILES_ATTRIBUTION}
                            url={DARK_TILES_URL}
                            maxZoom={DARK_TILES_MAX_ZOOM}
                        />

                        <MapFlyTo targetCoords={targetCoords} />

                        {events.map(event => {
                            const highlighted = isMatch(event)
                            return (
                                <Marker
                                    key={event.id}
                                    position={[event.lat, event.lon]}
                                    icon={highlighted ? matchPin : eventPin}
                                    opacity={searchTerm.trim() ? (highlighted ? 1.0 : 0.3) : 1.0}
                                >
                                    <Popup>
                                        <div className="max-w-[220px] grid gap-1">
                                            {event.urlImageMedium && (
                                                <img
                                                    src={event.urlImageMedium}
                                                    alt=""
                                                    className="w-full h-28 object-cover mb-1 border border-[var(--line)]"
                                                />
                                            )}
                                            <strong className="text-sm font-medium">{event.nameParty}</strong>
                                            <span className="muted text-xs">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</span>
                                            <span className="mono text-xs soft">{event.dateStart?.split('T')[0]}</span>
                                            <Link to={`/events/${event.id}`} state={{ event }} className="link mono text-xs mt-1">
                                                Line-up and details →
                                            </Link>
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