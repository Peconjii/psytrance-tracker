import { useEffect, useRef, useState } from 'react'
import { fetchEventsPage } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import GoabaseEventCard from './GoabaseEventCard.jsx'

const PAGE_SIZE = 24
// Start loading the next page once the user has scrolled through this share of the list
const PREFETCH_AT = 0.5

// Infinite list of events for one set of filters. The parent gives it a `key` built from
// the filters, so React throws this component away and starts fresh whenever they change.
function EventFeed({ search, country, genre, timeline }) {
    const [events, setEvents] = useState([])
    const [pagesWanted, setPagesWanted] = useState(1)
    const [pagesLoaded, setPagesLoaded] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)
    const [error, setError] = useState(null)
    const [weather, setWeather] = useState({})
    const sentinelRef = useRef(null)
    const weatherController = useRef(new AbortController())

    const loading = pagesLoaded < pagesWanted && !error

    // Cancel any weather request still in flight when the feed goes away (e.g. filters change)
    useEffect(() => {
        const controller = new AbortController()
        weatherController.current = controller
        return () => controller.abort()
    }, [])

    // Load the next page whenever we want more pages than we have
    useEffect(() => {
        if (error || pagesLoaded >= pagesWanted) return

        const controller = new AbortController()
        fetchEventsPage({ page: pagesLoaded, size: PAGE_SIZE, search, country, genre, timeline }, controller.signal)
            .then(data => {
                setEvents(prev => [...prev, ...data.content])
                setHasMore(data.hasNext)
                setTotal(data.totalElements)
                setPagesLoaded(data.page + 1)

                // Weather for the whole new page in one request; cards render without it until it arrives
                // (not tied to `controller`: that one is aborted as soon as pagesLoaded changes)
                fetchWeatherForEvents(data.content, weatherController.current.signal)
                    .then(found => setWeather(prev => ({ ...prev, ...found })))
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setError(err.response?.data?.message || 'Could not load events. Is the backend running?')
            })

        return () => controller.abort()
    }, [pagesWanted, pagesLoaded, error, search, country, genre, timeline])

    // Ask for another page once the user has scrolled past PREFETCH_AT of the list, marked by an
    // invisible sentinel inside the grid, so slow connections have time to load before the end.
    // The observer is recreated after every load and reports the sentinel's position right away,
    // so if the screen still isn't full, or the user is already past the new mark, it fires again.
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || loading || !hasMore || error) return

        const observer = new IntersectionObserver(entries => {
            const entry = entries[0]
            // Above the screen counts too: a fast scroller can pass the mark while a page is loading
            if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
                setPagesWanted(count => count + 1)
            }
        })

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loading, hasMore, error])

    if (events.length === 0 && loading) {
        return (
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
        )
    }

    if (events.length === 0 && !error) {
        return (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-md">
                <p className="text-slate-300 text-lg font-medium">No events found matching your filter criteria.</p>
            </div>
        )
    }

    return (
        <>
            {events.length > 0 && (
                <>
                    <p className="text-slate-500 text-xs mb-3">Showing {events.length} of {total} events</p>
                    <div className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                            {events.map(event => (
                                <GoabaseEventCard key={event.id} event={event} weather={weather[weatherKey(event)]} />
                            ))}
                        </div>
                        {hasMore && !error && (
                            <div
                                ref={sentinelRef}
                                aria-hidden="true"
                                className="absolute left-0 w-full h-px pointer-events-none"
                                style={{ top: `${PREFETCH_AT * 100}%` }}
                            />
                        )}
                    </div>
                </>
            )}

            {error ? (
                <div className="text-center py-10">
                    <p className="text-red-400 text-sm mb-3">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            ) : hasMore ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                    {loading && 'Loading more events...'}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500 text-sm font-medium tracking-wide">
                    ✦ You've reached the end of the events list. ✦
                </div>
            )}
        </>
    )
}

export default EventFeed
