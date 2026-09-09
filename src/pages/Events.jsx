import { useState, useEffect } from 'react'
import { fetchGoabaseEvents, fetchGoabaseEventsByCountry } from '../api/backend.js'
import GoabaseEventCard from '../components/GoabaseEventCard.jsx'

function Events() {
    const [loading, setLoading] = useState(true)
    const [goabaseEvents, setGoabaseEvents] = useState([])
    const [country, setCountry] = useState('')
    const [search, setSearch] = useState('')
    const [genre, setGenre] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [debouncedCountry, setDebouncedCountry] = useState('')

    // Lista popularnih podžanrova u psytrance sceni
    const genresList = [
        'All Genres',
        'Psytrance',
        'Progressive',
        'Full On',
        'Dark Psy',
        'Forest',
        'Goa',
        'Hi-Tech',
        'Zenonesque / Darkprog'
    ]

    // Debounce za pretragu države
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCountry(country)
        }, 800)
        return () => clearTimeout(timer)
    }, [country])

    // Dohvatanje podataka sa API-ja
    useEffect(() => {
        async function takeData() {
            setLoading(true)
            const goabaseData = debouncedCountry
                ? await fetchGoabaseEventsByCountry(debouncedCountry, 100)
                : await fetchGoabaseEvents(100)
            
            setGoabaseEvents(Array.isArray(goabaseData) ? goabaseData : [])
            setLoading(false)
        }
        takeData()
    }, [debouncedCountry])

    // Filtriranje događaja lokalno na osnovu svih izabranih kriterijuma
    const filteredEvents = (goabaseEvents || []).filter(event => {
        // Search filter (naziv događaja ili grada)
        const matchesSearch = event?.nameParty?.toLowerCase().includes(search.toLowerCase()) ||
                              event?.nameTown?.toLowerCase().includes(search.toLowerCase())

        // Genre filter
        const matchesGenre = !genre || genre === 'All Genres' ||
                             event?.nameType?.toLowerCase().includes(genre.toLowerCase())

        // Date range filter
        const eventDate = event?.dateStart ? new Date(event.dateStart) : null
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null

        let matchesDate = true
        if (eventDate) {
            if (start && eventDate < start) matchesDate = false
            if (end && eventDate > end) matchesDate = false
        }

        return matchesSearch && matchesGenre && matchesDate
    })

    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Filter Panel */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-white text-xl font-bold mb-4 text-center">Filter Psytrance Events</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search Input */}
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Search Event / Town</label>
                        <input
                            type='text'
                            placeholder='e.g. Boom Festival, Belgrade...'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className='w-full bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-400 text-sm'
                        />
                    </div>

                    {/* Country Input */}
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Filter by Country</label>
                        <input
                            type='text'
                            placeholder='e.g. Serbia, Germany...'
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className='w-full bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-400 text-sm'
                        />
                    </div>

                    {/* Genre Dropdown */}
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Genre / Subgenre</label>
                        <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className='w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-400 text-sm'
                        >
                            {genresList.map(g => (
                                <option key={g} value={g === 'All Genres' ? '' : g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Inputs */}
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-gray-400 text-xs mb-1">From Date</label>
                            <input
                                type='date'
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className='w-full bg-gray-700 text-white px-2 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-400 text-xs'
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-gray-400 text-xs mb-1">To Date</label>
                            <input
                                type='date'
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className='w-full bg-gray-700 text-white px-2 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-400 text-xs'
                            />
                        </div>
                    </div>
                </div>

                {/* Reset Filters Button */}
                {(search || country || genre || startDate || endDate) && (
                    <div className="mt-4 text-right">
                        <button
                            onClick={() => {
                                setSearch('')
                                setCountry('')
                                setGenre('')
                                setStartDate('')
                                setEndDate('')
                            }}
                            className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                            Reset All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Event List / Grid */}
            {loading ? (
                <p className='text-center text-cyan-400 text-2xl py-12'>Loading events...</p>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-xl">
                    <p className="text-gray-300 text-xl">No events found matching your filter criteria.</p>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {filteredEvents.map(event => (
                        <GoabaseEventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default Events