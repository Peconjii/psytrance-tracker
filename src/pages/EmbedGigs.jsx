import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchArtist } from '../api/backend.js'
import { SITE_URL } from '../hooks/usePageMeta.js'

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const SHOWN = 6

// "My next gigs" for an artist's own website: a small page without the site's menu, meant for an iframe
// (the code is on the artist's edit page). Links open the site in a new tab.
function EmbedGigs() {
    const { slug } = useParams()
    const [loaded, setLoaded] = useState({ slug: null, artist: null, failed: false })
    const artist = loaded.slug === slug ? loaded.artist : null

    useEffect(() => {
        const controller = new AbortController()
        fetchArtist(slug, controller.signal)
            .then(found => setLoaded({ slug, artist: found, failed: false }))
            .catch(() => { if (!controller.signal.aborted) setLoaded({ slug, artist: null, failed: true }) })
        return () => controller.abort()
    }, [slug])

    const page = `${SITE_URL}/artists/${encodeURIComponent(slug)}`
    const gigs = artist?.upcomingEvents.slice(0, SHOWN) ?? []
    return (
        <div className="embed">
            <div className="embed__head">
                <span className="page-head__tag m-0">// Next gigs{artist ? ` · ${artist.name}` : ''}</span>
            </div>
            {!artist ? (
                <p className="mono text-xs muted m-0">{loaded.failed && loaded.slug === slug ? 'Could not load the gigs.' : 'Loading…'}</p>
            ) : gigs.length === 0 ? (
                <p className="muted text-sm m-0">No gigs announced right now.</p>
            ) : (
                <ul className="rows">
                    {gigs.map(event => (
                        <li key={event.id}>
                            <a className="rows__item" href={`${SITE_URL}/events/${event.id}`} target="_blank" rel="noopener noreferrer">
                                <span className="rows__name">
                                    <span className="mono text-xs muted artist-gig__day">
                                        {event.dateStart ? DAY.format(new Date(event.dateStart + 'T12:00:00')) : 'TBA'}
                                    </span>
                                    {event.nameParty}
                                </span>
                                <span className="rows__meta">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
            <a className="embed__foot mono text-xs link" href={page} target="_blank" rel="noopener noreferrer">
                {artist && artist.upcomingEvents.length > SHOWN ? `All ${artist.upcomingEvents.length} gigs` : 'More'} on Map of Psy ↗
            </a>
        </div>
    )
}

export default EmbedGigs
