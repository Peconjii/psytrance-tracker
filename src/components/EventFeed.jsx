import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigationType } from 'react-router-dom'
import { fetchEventsPage, fetchGoingForEvents } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import EventRow, { BoardHead } from './EventRow.jsx'

const PAGE_SIZE = 24
// Start loading the next page once the user has scrolled through this share of the list
const PREFETCH_AT = 0.5

// The list the user last left (e.g. by opening an event), so pressing Back shows the same events
// at the same scroll position instead of starting again from page 1. Kept in memory only.
let savedFeed = null

// Infinite list of events for one set of filters. The parent gives it a `key` built from
// the filters, so React throws this component away and starts fresh whenever they change.
function EventFeed({ search, country, genre, timeline }) {
    const filtersKey = [search, country, genre, timeline].join('|')
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
    const sentinelRef = useRef(null)
    const weatherController = useRef(new AbortController())
    const latest = useRef(null)

    const loading = pagesLoaded < pagesWanted && !error

    useEffect(() => {
        latest.current = { filtersKey, events, pagesLoaded, hasMore, total, weather, goingByEvent }
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
                // Same for "I'm going": one request for the whole page
                fetchGoingForEvents(data.content, weatherController.current.signal)
                    .then(found => setGoingByEvent(prev => ({ ...prev, ...found })))
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
            <div className="board" aria-busy="true">
                <BoardHead />
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="board__row">
                        <div className="skeleton h-10" />
                        <div className="skeleton h-16 w-16 board__thumb-link" />
                        <div className="grid gap-2">
                            <div className="skeleton h-4 w-2/3" />
                            <div className="skeleton h-3 w-1/3" />
                        </div>
                        <span />
                    </div>
                ))}
            </div>
        )
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
                    <p className="mono text-xs muted mb-3">Showing {events.length} of {total} events</p>
                    <div className="relative board">
                        <BoardHead />
                        {events.map(event => (
                            <EventRow
                                key={event.id}
                                event={event}
                                weather={weather[weatherKey(event)]}
                                going={goingByEvent[event.id]}
                                onGoingChange={status => setGoingByEvent(prev => ({ ...prev, [event.id]: status }))}
                            />
                        ))}
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
                <p className="text-center py-10 mono text-xs muted tracking-widest">END OF THE BOARD</p>
            )}
        </>
    )
}

export default EventFeed
