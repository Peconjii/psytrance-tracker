import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigationType } from 'react-router-dom'
import { fetchEventsPage, fetchGenresForEvents, fetchGoingForEvents } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import EventTicket from './EventTicket.jsx'
import EventDays from './EventDays.jsx'

const PAGE_SIZE = 24
// Start loading the next page once the user has scrolled through this share of the list
const PREFETCH_AT = 0.5

// The list the user last left (e.g. by opening an event), so pressing Back shows the same events
// at the same scroll position instead of starting again from page 1. Kept in memory only.
let savedFeed = null

// Infinite list of events for one set of filters. The parent gives it a `key` built from
// the filters, so React throws this component away and starts fresh whenever they change.
function EventFeed({ search, country, genre, timeline, near }) {
    const filtersKey = [search, country, genre, timeline, near ? [near.lat, near.lon, near.km].join(',') : ''].join('|')
    const navigationType = useNavigationType()
    // Only Back/Forward ('POP') restores; clicking "Events" in the navbar should give a fresh list
    const [restored] = useState(() =>
        navigationType === 'POP' && savedFeed?.filtersKey === filtersKey ? savedFeed : null
    )

    const [events, setEvents] = useState(restored?.events ?? [])
    const [pagesWanted, setPagesWanted] = useState(restored?.pagesLoaded ?? 1)
    const [pagesLoaded, setPagesLoaded] = useState(restored?.pagesLoaded ?? 0)
    const [hasMore, setHasMore] = useState(restored?.hasMore ?? true)
    const [total, setTotal] = useState(restored?.total ?? 0)
    const [error, setError] = useState(null)
    const [weather, setWeather] = useState(restored?.weather ?? {})
    // { [eventId]: { count, going } }, loaded per page like the weather
    const [goingByEvent, setGoingByEvent] = useState(restored?.goingByEvent ?? {})
    // { [eventId]: [{ genreId, share, source }] }: the event's genres on the galaxy map
    const [genresByEvent, setGenresByEvent] = useState(restored?.genresByEvent ?? {})
    const sentinelRef = useRef(null)
    const weatherController = useRef(new AbortController())
    const latest = useRef(null)

    const loading = pagesLoaded < pagesWanted && !error

    useEffect(() => {
        latest.current = { filtersKey, events, pagesLoaded, hasMore, total, weather, goingByEvent, genresByEvent }
    })

    // Layout effect: it runs before the browser paints (no flash at the top of the list) and its
    // cleanup runs while this list is still on the page, so window.scrollY is still the real position
    useLayoutEffect(() => {
        if (restored) window.scrollTo(0, restored.scrollY)
        return () => {
            if (latest.current?.events.length > 0) {
                savedFeed = { ...latest.current, scrollY: window.scrollY }
            }
        }
    }, [restored])

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
        fetchEventsPage({ page: pagesLoaded, size: PAGE_SIZE, search, country, genre, timeline, near }, controller.signal)
            .then(data => {
                setEvents(prev => [...prev, ...data.content])
                setHasMore(data.hasNext)
                setTotal(data.totalElements)
                setPagesLoaded(data.page + 1)

                // Weather for the whole new page in one request; cards render without it until it arrives
                // (not tied to `controller`: that one is aborted as soon as pagesLoaded changes)
                fetchWeatherForEvents(data.content, weatherController.current.signal)
                    .then(found => setWeather(prev => ({ ...prev, ...found })))
                // Same for "I'm going": one request for the whole page
                fetchGoingForEvents(data.content, weatherController.current.signal)
                    .then(found => setGoingByEvent(prev => ({ ...prev, ...found })))
                // And the map genres, for the colored genre tags
                fetchGenresForEvents(data.content, weatherController.current.signal)
                    .then(found => setGenresByEvent(prev => ({ ...prev, ...found })))
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setError(err.response?.data?.message || 'Could not load events. Is the backend running?')
            })

        return () => controller.abort()
    }, [pagesWanted, pagesLoaded, error, search, country, genre, timeline, near])

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
        return <TicketSkeletons />
    }

    if (events.length === 0 && !error) {
        return (
            <div className="empty">
                <p><strong>No events match these filters.</strong></p>
                <p>Try another town, country or subgenre.</p>
            </div>
        )
    }

    return (
        <>
            {events.length > 0 && (
                <>
                    <p className="mono text-xs muted mb-4">Showing {events.length} of {total} events</p>
                    <div className="relative">
                        <EventDays
                            events={events}
                            renderTicket={event => (
                                <EventTicket
                                    key={event.id}
                                    event={event}
                                    weather={weather[weatherKey(event)]}
                                    going={goingByEvent[event.id]}
                                    genres={genresByEvent[event.id]}
                                    onGoingChange={status => setGoingByEvent(prev => ({ ...prev, [event.id]: status }))}
                                />
                            )}
                        />
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
                <div className="py-8 grid justify-items-center gap-3">
                    <p className="notice m-0">{error}</p>
                    <button onClick={() => setError(null)} className="btn">Try again</button>
                </div>
            ) : hasMore ? (
                <p className="text-center py-8 mono text-xs muted">
                    {loading && 'Loading more events...'}
                </p>
            ) : (
                <p className="text-center py-10 mono text-xs muted tracking-widest">END OF THE LIST</p>
            )}
        </>
    )
}

// Placeholder tickets while the first page loads
export function TicketSkeletons({ count = 6 }) {
    return (
        <div className="tickets" aria-busy="true">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="ticket">
                    <div className="ticket__stub"><div className="skeleton h-8 w-8" /></div>
                    <div className="ticket__body">
                        <div className="skeleton ticket__flyer" />
                        <div className="grid gap-2 content-start">
                            <div className="skeleton h-4 w-3/4" />
                            <div className="skeleton h-3 w-1/2" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default EventFeed
