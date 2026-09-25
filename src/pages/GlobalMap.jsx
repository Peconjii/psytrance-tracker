import { useState, useEffect } from 'react'
import { fetchMapEvents } from '../api/backend.js'
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
                setTargetCoords([firstMatch.lat, firstMatch.lon])
            }
        }
    }

    const matchedCount = events.filter(isMatch).length

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
            
            {/* Header + Pretraga Bar */}
            <div className="w-full mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                        Global Psytrance Map
                    </h1>
                    <span className="text-slate-400 text-sm mt-1 block">
                        Showing {events.length} mapped events worldwide
                    </span>
                </div>

                {/* Futuriski input za pretragu sa indikatorom poklapanja */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search country, town or event..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full bg-slate-900/80 text-white placeholder-slate-400 px-4 py-3 rounded-2xl border border-cyan-500/30 focus:outline-none focus:border-cyan-400 text-sm shadow-[0_0_15px_rgba(6,182,212,0.1)] backdrop-blur-md transition-all"
                    />
                    {searchTerm && (
                        <span className="absolute right-3 top-3 text-xs text-orange-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-xl border border-orange-500/40 shadow-md">
                            {matchedCount} highlighted
                        </span>
                    )}
                </div>
            </div>

            {/* Futuriski stakleni kontejner za mapu */}
            {loading ? (
                <div className="w-full h-[70vh] bg-slate-900/60 backdrop-blur-md rounded-3xl border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <p className="text-cyan-400 text-xl animate-pulse tracking-widest">[ LOADING GLOBAL PARTY MARKERS... ]</p>
                </div>
            ) : events.length === 0 ? (
                <div className="w-full h-[70vh] bg-slate-900/60 backdrop-blur-md rounded-3xl border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <p className="text-slate-400 text-xl">No valid coordinates found.</p>
                </div>
            ) : (
                <div className="w-full h-[70vh] rounded-3xl p-3 bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.2)] overflow-hidden relative">
                    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 relative z-10">
                        <MapContainer 
                            center={[20, 0]} 
                            zoom={2} 
                            scrollWheelZoom={true} 
                            className="w-full h-full"
                        >
                        <TileLayer
                            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>'
                            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                        />
                            
                            {/* Komponenta koja pomera kameru kada se unese država */}
                            <MapFlyTo targetCoords={targetCoords} />

                            {events.map(event => {
                                const highlighted = isMatch(event)
                                return (
                                    <Marker 
                                        key={event.id} 
                                        position={[event.lat, event.lon]}
                                        icon={highlighted ? highlightIcon : defaultIcon}
                                        opacity={searchTerm.trim() ? (highlighted ? 1.0 : 0.3) : 1.0}
                                    >
                                        <Popup>
                                            <div className="text-slate-900 max-w-xs text-center p-1">
                                                {event.urlImageMedium && (
                                                    <img 
                                                        src={event.urlImageMedium} 
                                                        alt={event.nameParty || 'Event'} 
                                                        className="w-full h-28 object-cover rounded-xl mb-2 shadow-md" 
                                                    />
                                                )}
                                                <h3 className="font-bold text-base mb-1 text-slate-900">{event.nameParty}</h3>
                                                <p className="text-xs text-slate-600 mb-1">{event.nameTown}, <strong className="text-slate-800">{event.nameCountry}</strong></p>
                                                <p className="text-xs text-purple-700 font-semibold mb-3">{event.dateStart?.split('T')[0]}</p>
                                                <a 
                                                    href={event.urlPartyHtml} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="inline-block bg-gradient-to-r from-cyan-500 to-purple-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow hover:opacity-90 transition-all"
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
                </div>
            )}
        </div>
    )
}

export default GlobalMap