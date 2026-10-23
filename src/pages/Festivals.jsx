import { useState } from 'react'
import { Link } from 'react-router-dom'
import CrewTabs from '../components/CrewTabs.jsx'
import { GenreChip } from '../components/AdminParts'
import { useMapExtras } from '../components/useMapExtras.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { artistsAtFestival, festivals } from '../map/data/types'

const SORTS = [
    { id: 'name', label: 'A–Z', by: (a, b) => a.name.localeCompare(b.name) },
    { id: 'old', label: 'Oldest', by: (a, b) => (a.since ?? 9999) - (b.since ?? 9999) || a.name.localeCompare(b.name) },
    { id: 'sets', label: 'Most sets on video', by: (a, b) => b.sets - a.sets || a.name.localeCompare(b.name) },
]

// Every festival station of the map: where, since when, its sound and how many sets from it are on video
function Festivals() {
    usePageMeta({
        title: 'Psytrance Festivals',
        description: 'The psytrance festivals of the map: where they are, since when and what they sound like.',
        path: '/festivals',
    })
    useMapExtras()
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('name')

    const term = search.trim().toLowerCase()
    const rows = festivals
        .map(f => ({ ...f, sets: artistsAtFestival(f.id).length }))
        .filter(f => !term || f.name.toLowerCase().includes(term) || (f.country ?? '').toLowerCase().includes(term))
        .sort(SORTS.find(s => s.id === sort).by)

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Stations · festivals</div>
                <h1 className="page-title">Festivals</h1>
                <p className="page-head__sub">The festivals of the map: where they are, since when and what they sound like.</p>
            </header>
            <CrewTabs />

            <div className="panel mb-6 grid gap-3">
                <div>
                    <label htmlFor="festival-search" className="field-label">Search festival</label>
                    <input id="festival-search" type="text" className="field" placeholder="Festival or country…"
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
                    <p><strong>No festival called “{search.trim()}” on the map.</strong></p>
                    <p><Link className="link" to="/new-page?kind=FESTIVAL">Is it your festival? Ask for it →</Link></p>
                </div>
            ) : (
                <ul className="grid sm:grid-cols-2 gap-3 list-none p-0 m-0">
                    {rows.map(f => (
                        <li key={f.id}>
                            <Link to={`/festivals/${encodeURIComponent(f.id)}`} className="panel block no-underline h-full">
                                <h2 className="m-0 text-base font-medium" style={{ color: 'var(--fg)' }}>{f.name}</h2>
                                <p className="mono text-xs muted mt-1 mb-2">
                                    {[f.country, f.since && `since ${f.since}`, f.sets ? `${f.sets} artists with sets on video` : null]
                                        .filter(Boolean).join(' · ')}
                                </p>
                                {f.description && <p className="soft text-sm mt-0 mb-2 line-clamp-2">{f.description}</p>}
                                <div className="flex flex-wrap gap-1">{f.genres.slice(0, 4).map(id => <GenreChip key={id} id={id} />)}</div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Festivals
