import { useState, useEffect } from 'react'
import { fetchGoabaseEvents, fetchGoabaseEventsByCountry } from '../api/backend.js'
import GoabaseEventCard from '../components/GoabaseEventCard.jsx'

function Events() {
    const [loading, setLoading] = useState(true)
    // Definisanje sa velikim G
    const [goabaseEvents, setGoabaseEvents] = useState([])
    const [country, setCountry] = useState('')
    const [search, setSearch] = useState('')
    const [debouncedCountry, setDebouncedCountry] = useState('')

    const filteredEvents = (goabaseEvents || []).filter(event =>
        event?.nameParty?.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCountry(country)
        }, 1000)
        return () => clearTimeout(timer)
    }, [country])

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

    return (
        <div>
            {loading ? (
                <p className='text-center text-dark text-2xl py-8'>Loading events...</p>
            ) : (
                <>
                    <input
                        type='text'
                        placeholder='Filter by country...'
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className='w-full max-w-md mx-auto block bg-white text-dark placeholder-gray-400 px-4 py-3 m-3 rounded-xl border border-gray-700 focus:outline-none focus:border-cyan-400 mb-6'
                    />
                    <input
                        type='text'
                        placeholder='Search events...'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className='w-full max-w-md mx-auto block bg-white text-dark placeholder-gray-400 px-4 py-3 m-3 rounded-xl border border-gray-700 focus:outline-none focus:border-cyan-400 mb-6'
                    />    
                    <div className='grid grid-cols-3 gap-6 p-4'>
                        {filteredEvents.map(event => (
                            <GoabaseEventCard key={event.id} event={event} />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default Events