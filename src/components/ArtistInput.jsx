import { useEffect, useId, useState } from 'react'
import { fetchArtists } from '../api/backend.js'
import { artistSlug } from '../map/data/events'
import { data } from '../map/data/types'

// Every artist of the map, by slug: they have a page even without gigs
const MAP_ARTISTS = new Map(data.genres.flatMap(g => g.artists).map(name => [artistSlug(name), name]))

// An artist's name in a timetable. While typing it offers the artists the site knows (the map's and the ones from
// line-ups); a known name links the set to that artist's page, which the mark after the field shows.
function ArtistInput({ value, onChange, className = 'field', ...rest }) {
    const listId = useId()
    const [found, setFound] = useState({ query: '', artists: [] })
    const query = value.trim()

    // The line-up artists matching what is typed, after a short pause
    useEffect(() => {
        if (query.length < 2) return
        const controller = new AbortController()
        const timer = setTimeout(() => {
            fetchArtists(query, controller.signal)
                .then(artists => setFound({ query, artists: artists.slice(0, 8) }))
                .catch(() => {})
        }, 300)
        return () => { clearTimeout(timer); controller.abort() }
    }, [query])

    const lower = query.toLowerCase()
    const fromMap = lower.length < 2 ? [] : [...MAP_ARTISTS.values()].filter(n => n.toLowerCase().includes(lower)).slice(0, 8)
    const fromLineUps = found.query === query ? found.artists : []
    const options = [...new Set([...fromMap, ...fromLineUps.map(a => a.name)])]

    const slug = artistSlug(query)
    const known = query && (MAP_ARTISTS.has(slug) || fromLineUps.some(a => a.slug === slug))

    return (
        <span className="flex flex-1 items-center gap-1 min-w-0">
            <input className={className} list={listId} value={value} onChange={(e) => onChange(e.target.value)}
                autoComplete="off" {...rest} />
            <datalist id={listId}>
                {options.map(name => <option key={name} value={name} />)}
            </datalist>
            {query && (known ? (
                <a className="mono text-xs link shrink-0" href={`/artists/${encodeURIComponent(slug)}`} target="_blank"
                    rel="noopener noreferrer" title={`${query} has a page: the set links to it`}>✓ page</a>
            ) : (
                <span className="mono text-xs muted shrink-0" title="Not on the site yet: the line-up reading adds a page">new</span>
            ))}
        </span>
    )
}

export default ArtistInput
