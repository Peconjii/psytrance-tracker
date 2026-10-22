import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventFeed from '../components/EventFeed.jsx'
import { GenreChip, GenreOptions } from '../components/AdminParts'
import { genreById } from '../map/data/types'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

// The genre filter uses the map's genres (?genre=forest). Links from before (?genre=Dark) still work.
const OLD_GENRES = { Progressive: 'prog', 'Full On': 'fullon', Dark: 'dark', Forest: 'forest', Goa: 'goa', 'Hi-Tech': 'hitech', Zenonesque: 'zenon' }
const genreOf = (value) => (genreById[value] ? value : OLD_GENRES[value] ?? 'All')
// value = what the backend expects (EventTimeline enum), label = what the user sees
const TIMELINES = [
    { value: 'ALL', label: 'Any time' },
    { value: 'THIS_WEEKEND', label: 'This weekend' }
]

// Filters live in the URL (?search=boom&genre=dark...), so going back from an event page, reloading
// or sharing the link brings back the same list. Defaults are left out to keep the URL short.
const DEFAULTS = { search: '', country: '', genre: 'All', timeline: 'ALL' }

function Events() {
    usePageMeta({
        title: 'Upcoming Psytrance Events, Festivals & Parties',
        description: 'Browse upcoming psytrance festivals and parties worldwide. Filter psytrance events by country, subgenre (progressive, full on, dark, forest, goa, hi-tech) or this weekend.',
        path: '/events',
    })
    const [searchParams, setSearchParams] = useSearchParams()

    const genre = genreOf(searchParams.get('genre'))
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

    // "Near me": the browser's position, rounded to about a kilometre; kept only on this page, never in the URL
    const [near, setNear] = useState(null)
    const [locating, setLocating] = useState(false)
    const [nearError, setNearError] = useState('')
    const findMe = () => {
        if (!navigator.geolocation) return setNearError('This browser can’t tell where you are.')
        setLocating(true)
        setNearError('')
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const round = (x) => Math.round(x * 100) / 100
                setNear({ lat: round(position.coords.latitude), lon: round(position.coords.longitude), km: near?.km ?? 100 })
                setLocating(false)
            },
            () => {
                setNearError('No location: allow it in the browser to see events near you.')
                setLocating(false)
            },
            { maximumAge: 10 * 60 * 1000, timeout: 15000 })
    }

    // A new key for every filter combination makes React start a fresh EventFeed from page 0
    const feedKey = [debouncedSearch, debouncedCountry, genre, timeline, near ? `${near.lat},${near.lon},${near.km}` : ''].join('|')

    const filtered = search || country || (genre && genre !== 'All') || timeline !== 'ALL' || near

    return (
        <div className="page page--wide">
            <header className="page-head flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="page-head__tag">// Departures · Goabase + Map of Psy</div>
                    <h1 className="page-title">Upcoming events</h1>
                    <p className="page-head__sub">Psytrance festivals and parties worldwide, soonest first.</p>
                </div>
                <Link className="btn shrink-0" to="/events/new">+ Add an event</Link>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="event-genre" className="field-label">Sound on the map</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {genre !== 'All' && <GenreChip id={genre} onRemove={() => setGenre('All')} />}
                            <select id="event-genre" className="field max-w-xs" value={genre === 'All' ? '' : genre}
                                onChange={(e) => setGenre(e.target.value || 'All')}>
                                <option value="">Any genre</option>
                                <GenreOptions />
                            </select>
                        </div>
                    </div>
                    <div>
                        <span className="field-label">Near me</span>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" className={`chip${near ? ' is-on' : ''}`} aria-pressed={Boolean(near)} disabled={locating}
                                onClick={() => (near ? setNear(null) : findMe())}>
                                {locating ? 'Finding you…' : near ? '◎ Near me ✕' : '◎ Near me'}
                            </button>
                            {near && (
                                <select className="field" style={{ width: 'auto' }} aria-label="How far" value={near.km}
                                    onChange={(e) => setNear(n => ({ ...n, km: Number(e.target.value) }))}>
                                    {[50, 100, 300, 1000].map(km => <option key={km} value={km}>within {km} km</option>)}
                                </select>
                            )}
                        </div>
                        {nearError && <p className="mono text-xs muted mt-2 mb-0">{nearError}</p>}
                    </div>
                </div>

                {filtered && (
                    <div className="mt-5 pt-4 border-t border-dashed border-[var(--line)] text-right">
                        <button
                            onClick={() => {
                                setSearch('')
                                setCountry('')
                                setNear(null)
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
                near={near}
            />
        </div>
    )
}

export default Events