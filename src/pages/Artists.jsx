import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArtists } from '../api/backend.js'
import { ROLES, ROLE_LABELS, matchesRole, roleOf } from '../components/artistRole.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import CrewTabs from '../components/CrewTabs.jsx'
import usePageMeta from '../hooks/usePageMeta.js'

// Artists found in the line-ups of upcoming events, busiest first. The backend reads line-ups
// from Goabase a few events at a time, so right after a fresh start the list fills up gradually.
function Artists() {
    usePageMeta({
        title: 'Psytrance Artists',
        description: 'Search psytrance artists and DJs across the line-ups of upcoming festivals and parties, and see where they play next.',
        path: '/artists',
    })
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim(), 300)
    // Tagged with the search it belongs to, so a slow old answer never replaces a newer one
    const [result, setResult] = useState({ search: null, artists: [], error: null })
    const [attempt, setAttempt] = useState(0)
    // '' = everyone, else 'DJ' (producers too), 'PRODUCER' or 'LIVE' (picked or guessed)
    const [roleFilter, setRoleFilter] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        fetchArtists(debouncedSearch, controller.signal)
            .then(artists => setResult({ search: debouncedSearch, artists, error: null }))
            .catch(err => {
                if (controller.signal.aborted) return
                setResult({
                    search: debouncedSearch,
                    artists: [],
                    error: err.response?.data?.message || 'Could not load artists. Is the backend running?'
                })
            })
        return () => controller.abort()
    }, [debouncedSearch, attempt])

    const loading = result.search !== debouncedSearch
    const withRoles = result.artists.map(artist => ({ ...artist, role: roleOf(artist).role }))
    const shown = roleFilter ? withRoles.filter(artist => matchesRole(artist.role, roleFilter)) : withRoles

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Crew · from the line-ups</div>
                <h1 className="page-title">Artists</h1>
                <p className="page-head__sub">Who plays the upcoming events, busiest first. Find out where they play next.</p>
            </header>
            <CrewTabs />

            <div className="panel mb-6">
                <label htmlFor="artist-search" className="field-label">Search artist</label>
                <input
                    id="artist-search"
                    type="text"
                    placeholder="Astrix, Ace Ventura..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="field"
                />
                <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Role">
                    {[{ value: '', label: 'Everyone' }, ...ROLES.map(r => ({ ...r, label: r.label + 's' }))].map(r => (
                        <button key={r.value} type="button" className={`chip${roleFilter === r.value ? ' is-on' : ''}`}
                            aria-pressed={roleFilter === r.value} onClick={() => setRoleFilter(r.value)}>
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {result.error ? (
                <div className="py-8 grid justify-items-center gap-3">
                    <p className="notice m-0">{result.error}</p>
                    <button onClick={() => setAttempt(count => count + 1)} className="btn">Try again</button>
                </div>
            ) : loading && result.artists.length === 0 ? (
                <ul className="rows" aria-busy="true">
                    {[...Array(9)].map((_, i) => (
                        <li key={i} className="rows__item"><div className="skeleton h-4 w-1/3" /></li>
                    ))}
                </ul>
            ) : shown.length === 0 ? (
                <div className="empty">
                    <p><strong>
                        {roleFilter && result.artists.length > 0
                            ? `No ${ROLE_LABELS[roleFilter]}s here. Try everyone.`
                            : debouncedSearch ? `No upcoming events with "${debouncedSearch}" in the line-up.` : 'No artists found yet.'}
                    </strong></p>
                    <p>Line-ups are read in the background a few events at a time, so check back in a little while.</p>
                </div>
            ) : (
                <ul className={`rows md:columns-2 md:gap-8 ${loading ? 'opacity-60' : ''}`}>
                    {shown.map(artist => (
                        <li key={artist.slug} className="break-inside-avoid">
                            <Link
                                to={`/artists/${encodeURIComponent(artist.slug)}`}
                                state={{ name: artist.name }}
                                className="rows__item"
                            >
                                <span className="rows__name">{artist.name}</span>
                                <span className="rows__meta">
                                    {ROLE_LABELS[artist.role]} · {artist.upcomingEvents} {artist.upcomingEvents === 1 ? 'event' : 'events'}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Artists
