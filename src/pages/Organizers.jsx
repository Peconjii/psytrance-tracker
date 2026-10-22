import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrganizers } from '../api/backend.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'
import CrewTabs from '../components/CrewTabs.jsx'

// Organizers (crews, promoters) of the upcoming events, busiest first: who Goabase says runs each event
function Organizers() {
    usePageMeta({
        title: 'Psytrance Organizers',
        description: 'Psytrance crews and promoters and the festivals and parties they run.',
        path: '/organizers',
    })
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim(), 300)
    // Tagged with the search it belongs to, so a slow old answer never replaces a newer one
    const [result, setResult] = useState({ search: null, organizers: [], error: null })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        const controller = new AbortController()
        fetchOrganizers(debouncedSearch, controller.signal)
            .then(organizers => setResult({ search: debouncedSearch, organizers, error: null }))
            .catch(err => {
                if (controller.signal.aborted) return
                setResult({ search: debouncedSearch, organizers: [], error: err.response?.data?.message || 'Could not load organizers.' })
            })
        return () => controller.abort()
    }, [debouncedSearch, attempt])

    const loading = result.search !== debouncedSearch

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Captains · who runs the ships</div>
                <h1 className="page-title">Organizers</h1>
                <p className="page-head__sub">The crews and promoters behind the upcoming events, busiest first.</p>
            </header>
            <CrewTabs />

            <div className="panel mb-6">
                <label htmlFor="organizer-search" className="field-label">Search organizer</label>
                <input id="organizer-search" type="text" placeholder="Crew or promoter…" value={search}
                    onChange={(e) => setSearch(e.target.value)} className="field" />
            </div>

            {result.error ? (
                <div className="py-8 grid justify-items-center gap-3">
                    <p className="notice m-0">{result.error}</p>
                    <button onClick={() => setAttempt(count => count + 1)} className="btn">Try again</button>
                </div>
            ) : loading && result.organizers.length === 0 ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : result.organizers.length === 0 ? (
                <div className="empty">
                    <p><strong>{debouncedSearch ? `No organizer called "${debouncedSearch}" with upcoming events.` : 'No organizers yet.'}</strong></p>
                    <p>Organizers are read with the line-ups in the background, so the list fills up over a day or so.</p>
                    {debouncedSearch && (
                        <p><Link className="link" to={`/new-page?kind=ORGANIZER&name=${encodeURIComponent(debouncedSearch)}`}>Is it your crew? Ask for a page →</Link></p>
                    )}
                </div>
            ) : (
                <ul className={`rows md:columns-2 md:gap-8 ${loading ? 'opacity-60' : ''}`}>
                    {result.organizers.map(organizer => (
                        <li key={organizer.slug} className="break-inside-avoid">
                            <Link to={`/organizers/${encodeURIComponent(organizer.slug)}`} className="rows__item">
                                <span className="rows__name">{organizer.name}</span>
                                <span className="rows__meta">{organizer.upcomingEvents} {organizer.upcomingEvents === 1 ? 'event' : 'events'}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Organizers
