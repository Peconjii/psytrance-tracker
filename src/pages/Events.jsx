import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventFeed from '../components/EventFeed.jsx'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

const GENRES = ['All', 'Psytrance', 'Progressive', 'Full On', 'Dark', 'Forest', 'Goa', 'Hi-Tech', 'Zenonesque']
// value = what the backend expects (EventTimeline enum), label = what the user sees
const TIMELINES = [
    { value: 'ALL', label: 'Any time' },
    { value: 'THIS_WEEKEND', label: 'This weekend' }
]

// Filters live in the URL (?search=boom&genre=Dark...), so going back from an event page, reloading
// or sharing the link brings back the same list. Defaults are left out to keep the URL short.
const DEFAULTS = { search: '', country: '', genre: 'All', timeline: 'ALL' }

function Events() {
    usePageMeta({
        title: 'Upcoming Psytrance Events, Festivals & Parties',
        description: 'Browse upcoming psytrance festivals and parties worldwide. Filter psytrance events by country, subgenre (progressive, full on, dark, forest, goa, hi-tech) or this weekend.',
        path: '/events',
    })
    const [searchParams, setSearchParams] = useSearchParams()

    const genre = GENRES.includes(searchParams.get('genre')) ? searchParams.get('genre') : 'All'
    const timeline = TIMELINES.some(t => t.value === searchParams.get('timeline')) ? searchParams.get('timeline') : 'ALL'

    // What the user is typing; it goes into the URL once it's debounced
    const [search, setSearch] = useState(() => searchParams.get('search') || '')
    const [country, setCountry] = useState(() => searchParams.get('country') || '')

    // Text inputs wait until the user stops typing before asking the backend
    const debouncedSearch = useDebouncedValue(search.trim(), 300)
    const debouncedCountry = useDebouncedValue(country.trim(), 300)

    // `replace` so filter tweaks don't pile up in history: Back should leave the page, not undo a filter
    const updateParams = (changes) => {
        const next = new URLSearchParams(searchParams)
        for (const [name, value] of Object.entries(changes)) {
            if (value && value !== DEFAULTS[name]) next.set(name, value)
            else next.delete(name)
        }
        // Only navigate when something changed, otherwise the new URL would re-run the effect below forever
        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true })
        }
    }

    const setGenre = (value) => updateParams({ genre: value })
    const setTimeline = (value) => updateParams({ timeline: value })

    useEffect(() => {
        updateParams({ search: debouncedSearch, country: debouncedCountry })
    }, [debouncedSearch, debouncedCountry]) // eslint-disable-line react-hooks/exhaustive-deps

    // A new key for every filter combination makes React start a fresh EventFeed from page 0
    const feedKey = [debouncedSearch, debouncedCountry, genre, timeline].join('|')

    const filtered = search || country || (genre && genre !== 'All') || timeline !== 'ALL'

    return (
        <div className="page page--wide">
            <header className="page-head">
                <div className="page-head__tag">// Departures · Goabase</div>
                <h1 className="page-title">Upcoming events</h1>
                <p className="page-head__sub">Psytrance festivals and parties worldwide, soonest first.</p>
            </header>

            <section className="panel mb-6" aria-label="Filters">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                    <div>
                        <label htmlFor="event-search" className="field-label">Event or town</label>
                        <input
                            id="event-search"
                            type="text"
                            placeholder="Ozora, Lisbon..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="field"
                        />
                    </div>

                    <div>
                        <label htmlFor="event-country" className="field-label">Country</label>
                        <input
                            id="event-country"
                            type="text"
                            placeholder="Serbia..."
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="field"
                        />
                    </div>

                    <div>
                        <span className="field-label">When</span>
                        <div className="flex flex-wrap gap-2">
                            {TIMELINES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setTimeline(t.value)}
                                    className={`chip${timeline === t.value ? ' is-on' : ''}`}
                                    aria-pressed={timeline === t.value}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <span className="field-label">Subgenre</span>
                <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                        <button
                            key={g}
                            onClick={() => setGenre(g)}
                            className={`chip${genre === g ? ' is-on' : ''}`}
                            aria-pressed={genre === g}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                {filtered && (
                    <div className="mt-5 pt-4 border-t border-dashed border-[var(--line)] text-right">
                        <button
                            onClick={() => {
                                setSearch('')
                                setCountry('')
                                // One update: two in a row would both start from the same old URL
                                updateParams({ genre: 'All', timeline: 'ALL' })
                            }}
                            className="btn btn--ghost btn--danger"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </section>

            <EventFeed
                key={feedKey}
                search={debouncedSearch}
                country={debouncedCountry}
                genre={genre}
                timeline={timeline}
            />
        </div>
    )
}

export default Events