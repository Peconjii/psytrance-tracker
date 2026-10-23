import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLabelsOverview } from '../api/backend.js'
import CrewTabs from '../components/CrewTabs.jsx'
import { GenreChip } from '../components/AdminParts'
import { useMapExtras } from '../components/useMapExtras.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { genresOfLabel, labels } from '../map/data/types'

const SORTS = [
    { id: 'busy', label: 'Busiest', by: (a, b) => b.upcoming - a.upcoming || a.name.localeCompare(b.name) },
    { id: 'crew', label: 'Biggest crew', by: (a, b) => b.crew - a.crew || a.name.localeCompare(b.name) },
    { id: 'name', label: 'A–Z', by: (a, b) => a.name.localeCompare(b.name) },
    { id: 'old', label: 'Oldest', by: (a, b) => (a.since ?? 9999) - (b.since ?? 9999) || a.name.localeCompare(b.name) },
]

// Every record label of the map: where it is from, since when, its crew, its sound and how busy the crew is.
// The map data gives the label; the backend adds the crew as admins changed it, the upcoming gigs and the followers.
function Labels() {
    usePageMeta({
        title: 'Psytrance Labels',
        description: 'Psytrance record labels: their artists, their sound and where their crew plays next.',
        path: '/labels',
    })
    useMapExtras()
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('busy')
    const [overview, setOverview] = useState({})

    useEffect(() => {
        const controller = new AbortController()
        fetchLabelsOverview(controller.signal)
            .then(list => setOverview(Object.fromEntries(list.map(l => [l.label, l]))))
            .catch(() => {})
        return () => controller.abort()
    }, [])

    const term = search.trim().toLowerCase()
    const rows = Object.entries(labels)
        .map(([name, l]) => ({
            name, country: l.country, since: l.since,
            crew: overview[name]?.crew ?? l.artists.length,
            upcoming: overview[name]?.upcomingGigs ?? 0,
            followers: overview[name]?.followers ?? 0,
            genres: genresOfLabel(name).map(g => g.id),
        }))
        .filter(l => !term || l.name.toLowerCase().includes(term) || (l.country ?? '').toLowerCase().includes(term))
        .sort(SORTS.find(s => s.id === sort).by)

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Constellations · labels</div>
                <h1 className="page-title">Labels</h1>
                <p className="page-head__sub">The record labels of the map: their crew, their sound and how busy the crew is.</p>
            </header>
            <CrewTabs />

            <div className="panel mb-6 grid gap-3">
                <div>
                    <label htmlFor="label-search" className="field-label">Search label</label>
                    <input id="label-search" type="text" className="field" placeholder="Label or country…"
                        value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sort">
                    {SORTS.map(s => (
                        <button key={s.id} type="button" role="radio" aria-checked={sort === s.id}
                            className={'chip' + (sort === s.id ? ' is-on' : '')} onClick={() => setSort(s.id)}>{s.label}</button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="empty">
                    <p><strong>No label called “{search.trim()}” on the map.</strong></p>
                    <p><Link className="link" to={`/new-page?kind=LABEL&name=${encodeURIComponent(search.trim())}`}>Is it your label? Ask for it →</Link></p>
                </div>
            ) : (
                <ul className="grid sm:grid-cols-2 gap-3 list-none p-0 m-0">
                    {rows.map(l => (
                        <li key={l.name}>
                            <Link to={`/labels/${encodeURIComponent(l.name)}`} className="panel block no-underline h-full">
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="m-0 text-base font-medium" style={{ color: 'var(--fg)' }}>{l.name}</h2>
                                    {l.followers > 0 && <span className="mono text-xs muted shrink-0">★ {l.followers}</span>}
                                </div>
                                <p className="mono text-xs muted mt-1 mb-2">
                                    {[l.country, l.since && `since ${l.since}`, `${l.crew} artists`,
                                        l.upcoming ? `${l.upcoming} gigs coming up` : null].filter(Boolean).join(' · ')}
                                </p>
                                <div className="flex flex-wrap gap-1">{l.genres.slice(0, 4).map(id => <GenreChip key={id} id={id} />)}</div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Labels
