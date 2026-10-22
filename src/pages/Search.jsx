import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchSite } from '../api/backend.js'
import { useMapExtras } from '../components/useMapExtras.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { artistSlug } from '../map/data/events'
import { data } from '../map/data/types'

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const SHOWN = 8
// Every artist on the map: they have a page even before a line-up names them
const MAP_ARTISTS = [...new Set(data.genres.flatMap(g => g.artists))]

// One search box for the whole site: the map's genres and artists are searched here, the rest by the backend
function Search() {
    usePageMeta({ title: 'Search', path: '/search', noindex: true })
    const [params, setParams] = useSearchParams()
    const [text, setText] = useState(params.get('q') ?? '')
    const query = useDebouncedValue(text.trim(), 300)
    const [found, setFound] = useState({ query: null, results: null, error: '' })
    useMapExtras()

    // The query stays in the address, so a search can be shared or opened again with Back
    useEffect(() => {
        setParams(query ? { q: query } : {}, { replace: true })
    }, [query, setParams])

    useEffect(() => {
        if (query.length < 2) return
        const controller = new AbortController()
        searchSite(query, controller.signal)
            .then(results => setFound({ query, results, error: '' }))
            .catch(() => { if (!controller.signal.aborted) setFound({ query, results: null, error: 'Could not search right now. Try again.' }) })
        return () => controller.abort()
    }, [query])

    const lower = query.toLowerCase()
    const results = found.query === query ? found.results : null
    const genres = lower.length < 2 ? [] : data.genres.filter(g => g.name.toLowerCase().includes(lower)).slice(0, SHOWN)
    // Map artists the backend doesn't know yet (no line-up named them), after the ones it found
    const backendSlugs = new Set((results?.artists ?? []).map(a => a.slug))
    const mapArtists = lower.length < 2 ? [] : MAP_ARTISTS
        .filter(name => name.toLowerCase().includes(lower) && !backendSlugs.has(artistSlug(name))).slice(0, SHOWN)
    const nothing = results && genres.length === 0 && mapArtists.length === 0
        && ['artists', 'organizers', 'events', 'labels', 'festivals'].every(k => results[k].length === 0)

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Scanner</div>
                <h1 className="page-title">Search</h1>
            </header>
            <input className="field mb-6" type="search" autoFocus aria-label="Search the site"
                placeholder="An artist, label, festival, organizer, event, town or genre…" maxLength={60}
                value={text} onChange={(e) => setText(e.target.value)} />

            {query.length < 2 ? (
                <p className="muted text-sm">Type at least two letters.</p>
            ) : found.error && found.query === query ? (
                <p className="notice">{found.error}</p>
            ) : !results ? (
                <p className="mono text-xs muted">Searching…</p>
            ) : nothing ? (
                <div className="empty">
                    <p><strong>Nothing called “{query}” on the site.</strong></p>
                    <p><Link className="link" to={`/new-page?name=${encodeURIComponent(query)}`}>Not on the map yet? Ask for a page →</Link></p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    <Group title="Artists" count={results.artists.length + mapArtists.length}>
                        {results.artists.map(a => (
                            <Row key={a.slug} to={`/artists/${encodeURIComponent(a.slug)}`} name={a.name}
                                meta={a.upcomingEvents ? `${a.upcomingEvents} upcoming` : 'no gigs coming up'} />
                        ))}
                        {mapArtists.map(name => (
                            <Row key={name} to={`/artists/${encodeURIComponent(artistSlug(name))}`} name={name} meta="on the map" />
                        ))}
                    </Group>
                    <Group title="Upcoming events" count={results.events.length}>
                        {results.events.map(e => (
                            <Row key={e.id} to={`/events/${e.id}`} name={e.name}
                                meta={[e.dateStart && DAY.format(new Date(e.dateStart + 'T12:00:00')), e.town].filter(Boolean).join(' · ')} />
                        ))}
                    </Group>
                    <Group title="Genres" count={genres.length}>
                        {genres.map(g => (
                            <Row key={g.id} to={`/?genre=${g.id}`} name={g.name} meta={`${g.artists.length} artists`}
                                color={data.families[g.family].color} />
                        ))}
                    </Group>
                    <Group title="Labels" count={results.labels.length}>
                        {results.labels.map(name => <Row key={name} to={`/labels/${encodeURIComponent(name)}`} name={name} />)}
                    </Group>
                    <Group title="Festivals" count={results.festivals.length}>
                        {results.festivals.map(f => <Row key={f.id} to={`/festivals/${encodeURIComponent(f.id)}`} name={f.name} />)}
                    </Group>
                    <Group title="Organizers" count={results.organizers.length}>
                        {results.organizers.map(o => <Row key={o.slug} to={`/organizers/${encodeURIComponent(o.slug)}`} name={o.name} />)}
                    </Group>
                </div>
            )}
        </div>
    )
}

// One kind of result; nothing when there are none of that kind
function Group({ title, count, children }) {
    if (!count) return null
    return (
        <section className="panel">
            <h2 className="panel__label">{title} · {count}</h2>
            <ul className="rows">{children}</ul>
        </section>
    )
}

function Row({ to, name, meta, color }) {
    return (
        <li>
            <Link to={to} className="rows__item">
                <span className="rows__name" style={color ? { color } : undefined}>{name}</span>
                {meta && <span className="rows__meta">{meta}</span>}
            </Link>
        </li>
    )
}

export default Search
