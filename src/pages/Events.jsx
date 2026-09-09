import { useState, useEffect } from 'react'
import { fetchGoabaseEvents, fetchGoabaseEventsByCountry } from '../api/backend.js'
import GoabaseEventCard from '../components/GoabaseEventCard.jsx'

function Events() {
    const [loading, setLoading] = useState(true)
    const [goabaseEvents, setGoabaseEvents] = useState([])
    const [country, setCountry] = useState('')
    const [search, setSearch] = useState('')
    const [genre, setGenre] = useState('All')
    const [eventStatus, setEventStatus] = useState('All') // Filter po statusu
    const [debouncedCountry, setDebouncedCountry] = useState('')
    const [visibleCount, setVisibleCount] = useState(12)

    const GENRES = ['All', 'Psytrance', 'Progressive', 'Full On', 'Dark', 'Forest', 'Goa', 'Hi-Tech', 'Zenonesque']
    const STATUSES = ['All', 'Upcoming', 'This Weekend', 'Past Events']

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedCountry(country), 800)
        return () => clearTimeout(timer)
    }, [country])

    useEffect(() => {
        async function takeData() {
            setLoading(true)
            const goabaseData = debouncedCountry
                ? await fetchGoabaseEventsByCountry(debouncedCountry, 300)
                : await fetchGoabaseEvents(300)
            
            setGoabaseEvents(Array.isArray(goabaseData) ? goabaseData : [])
            setLoading(false)
        }
        takeData()
    }, [debouncedCountry])

    // Resetuj broj prikazanih kartica pri promeni bilo kog filtera
    useEffect(() => {
        setVisibleCount(12)
    }, [search, country, genre, eventStatus])

    // Filtriranje događaja uključujući status vremenske linije
    const filteredEvents = (goabaseEvents || []).filter(event => {
        const matchesSearch = !search || 
            event?.nameParty?.toLowerCase().includes(search.toLowerCase()) ||
            event?.nameTown?.toLowerCase().includes(search.toLowerCase())

        const selectedGenreLower = genre.toLowerCase()
        const matchesGenre = !genre || genre === 'All' ||
            event?.nameType?.toLowerCase().includes(selectedGenreLower) ||
            event?.nameParty?.toLowerCase().includes(selectedGenreLower)

        const now = new Date()
        const eventDate = event?.dateStart ? new Date(event.dateStart) : null
        
        let matchesStatus = true
        if (eventDate) {
            if (eventStatus === 'Upcoming') {
                matchesStatus = eventDate >= now
            } else if (eventStatus === 'Past Events') {
                matchesStatus = eventDate < now
            } else if (eventStatus === 'This Weekend') {
                const dayOfWeek = now.getDay()
                const diffToFriday = (5 - dayOfWeek + 7) % 7
                const friday = new Date(now)
                friday.setDate(now.getDate() + diffToFriday)
                friday.setHours(0, 0, 0, 0)

                const sunday = new Date(friday)
                sunday.setDate(friday.getDate() + 2)
                sunday.setHours(23, 59, 59, 999)

                matchesStatus = eventDate >= friday && eventDate <= sunday
            }
        }

        return matchesSearch && matchesGenre && matchesStatus
    })

    // Infinite Scroll trigger logic
    useEffect(() => {
        function handleScroll() {
            const scrollPosition = window.innerHeight + window.scrollY
            const threshold = document.documentElement.offsetHeight - 600

            if (scrollPosition >= threshold) {
                setVisibleCount(prev => {
                    if (prev < filteredEvents.length) {
                        return prev + 12
                    }
                    return prev
                })
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [filteredEvents.length])

    const visibleEvents = filteredEvents.slice(0, visibleCount)

    return (
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 py-8">
            
            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    Psytrance Events Hub
                </h1>
                <p className="text-slate-400 text-sm mt-1">Discover, filter and track underground gatherings worldwide</p>
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md p-4 sm:p-8 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] mb-8 border border-cyan-500/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Search Event / Town</label>
                        <input
                            type="text"
                            placeholder="e.g. Boom Festival..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-400 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Filter by Country</label>
                        <input
                            type="text"
                            placeholder="e.g. Serbia..."
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-slate-950/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-400 text-sm"
                        />
                    </div>

                    {/* Quick Status Selector Pills */}
                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Event Timeline</label>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUSES.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setEventStatus(s)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        eventStatus === s
                                            ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                            : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Genre Selector Pills */}
                <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subgenre</label>
                    <div className="flex flex-wrap gap-2">
                        {GENRES.map(g => (
                            <button
                                key={g}
                                onClick={() => setGenre(g)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                    genre === g
                                        ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105"
                                        : "bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reset Filters Button */}
                {(search || country || (genre && genre !== 'All') || (eventStatus && eventStatus !== 'All')) && (
                    <div className="mt-6 text-right border-t border-slate-800/80 pt-4">
                        <button
                            onClick={() => {
                                setSearch('')
                                setCountry('')
                                setGenre('All')
                                setEventStatus('All')
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold tracking-wider uppercase underline cursor-pointer transition-colors"
                        >
                            Reset All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Event Grid sa Skeleton Loaderima */}
            {loading ? (
                /* SKELETON LOADERS - 8 pulsirajućih kartica umesto običnog teksta */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 h-72 animate-pulse flex flex-col justify-between">
                            <div className="w-full h-36 bg-slate-800/60 rounded-2xl mb-3" />
                            <div className="h-4 bg-slate-800/60 rounded-lg w-3/4 mb-2" />
                            <div className="h-3 bg-slate-800/40 rounded-lg w-1/2 mb-4" />
                            <div className="h-8 bg-slate-800/40 rounded-xl w-full" />
                        </div>
                    ))}
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-md">
                    <p className="text-slate-300 text-lg font-medium">No events found matching your filter criteria.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {visibleEvents.map(event => (
                            <GoabaseEventCard key={event.id} event={event} />
                        ))}
                    </div>

                    {/* Indikator kada se učitaju svi događaji iz filtrirane liste */}
                    {visibleCount >= filteredEvents.length && (
                        <div className="text-center py-12 text-slate-500 text-sm font-medium tracking-wide">
                            ✦ You've reached the end of the events list. ✦
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default Events