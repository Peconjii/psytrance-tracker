import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchArtist, fetchMyArtists } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import FollowButton from '../components/FollowButton.jsx'
import ClaimPage from '../components/ClaimPage.jsx'
import ArtistNumbers from '../components/ArtistNumbers.jsx'
import usePageMeta from '../hooks/usePageMeta.js'
import {
    appearances, artists as mapProfiles, data, festivalById, genresOfArtist, labelsOfArtist, tracksOfArtist,
} from '../map/data/types'
import { mapArtistBySlug } from '../map/data/events'
import { loadPlacements } from '../map/data/placements'
import { ROLE_LABELS, roleOf } from '../components/artistRole.js'

const GIG_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const PAST_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const day = (iso, format) => (iso ? format.format(new Date(iso + 'T12:00:00')) : 'Date TBA')

// The links an artist's profile can have, in the order they are shown
const PROFILE_LINKS = [
    ['soundcloudUrl', 'SoundCloud'],
    ['bandcampUrl', 'Bandcamp'],
    ['instagramUrl', 'Instagram'],
    ['websiteUrl', 'Website'],
]

// Until the artist writes their own, a search for them there (like the SoundCloud links of an event's line-up)
const SEARCH_LINKS = [
    ['soundcloudUrl', 'SoundCloud', (name) => `https://soundcloud.com/search/people?q=${encodeURIComponent(name)}`],
]

const youtubeLink = (track) => track.youtube
    ? `https://www.youtube.com/watch?v=${track.youtube}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.title}`)}`

function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
}

// One section of the profile, in the site's panel style
function Section({ label, children }) {
    return (
        <section className="panel mb-4">
            <h2 className="panel__label">{label}</h2>
            {children}
        </section>
    )
}

// An artist's profile: who they are (photo, bio, links, booking), their sound from the map (genres, tracks,
// albums, labels, festivals) and where they play next and played before. Artists who are only on the map, not in
// any line-up yet, get a profile too, from the map alone.
function Artist() {
    const { slug } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()
    // The name as the link showed it, so the header doesn't wait for the backend
    const passedName = location.state?.name

    // Tagged with the slug it belongs to, so another artist's data never shows while this one loads
    const [loaded, setLoaded] = useState({ slug: null, artist: null, error: null })
    const [attempt, setAttempt] = useState(0)
    // The map's placements come from the backend; until they are in, the genres are the bundled ones
    const [, setPlacementsIn] = useState(false)
    // Artists whose profile this account owns (an admin linked them), for "Edit profile"
    const [mine, setMine] = useState([])

    const artist = loaded.slug === slug ? loaded.artist : null
    const error = loaded.slug === slug ? loaded.error : null
    const onMap = mapArtistBySlug(slug)
    const name = artist?.name || onMap?.name || passedName || slug
    const profile = artist?.profile

    // The map's side of the artist, by the name the map knows them by
    const mapName = onMap?.name
    const genres = mapName ? genresOfArtist(mapName) : []
    const mapTracks = mapName ? tracksOfArtist(mapName).slice(0, 8) : []
    const albums = mapName ? mapProfiles[mapName]?.albums ?? [] : []
    const labels = mapName ? labelsOfArtist(mapName) : []
    const mapFestivals = mapName ? (appearances[mapName] ?? []).filter(x => festivalById[x.festival]) : []
    // What the artist wrote on their profile comes first; the map's tracks only when they wrote none, and the map's
    // festivals unless they named the same one
    const ownTracks = artist?.tracks ?? []
    const ownFestivals = artist?.festivals ?? []
    const tracks = ownTracks.length > 0 ? [] : mapTracks
    const named = new Set(ownFestivals.map(f => f.name.toLowerCase()))
    const festivals = mapFestivals.filter(x => !named.has(festivalById[x.festival].name.toLowerCase()))
    const canEdit = Boolean(artist && (user?.admin || mine.some(a => a.slug === artist.slug)))
    const role = artist ? roleOf(artist) : null
    const origin = mapName ? mapProfiles[mapName]?.country : null

    usePageMeta({
        title: `${name} – Psytrance Artist`,
        description: profile?.bio || `${name}: genres, tracks, labels and where they play next on Map of Psy.`,
        path: `/artists/${slug}`,
    })

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [slug])

    useEffect(() => {
        loadPlacements().then(() => setPlacementsIn(true))
    }, [])

    useEffect(() => {
        if (!user) return
        const controller = new AbortController()
        fetchMyArtists(controller.signal).then(setMine).catch(() => {})
        return () => controller.abort()
    }, [user])

    useEffect(() => {
        const controller = new AbortController()
        fetchArtist(slug, controller.signal)
            .then(found => setLoaded({ slug, artist: found, error: null }))
            .catch(err => {
                if (controller.signal.aborted) return
                setLoaded({
                    slug,
                    artist: null,
                    // Artists only exist in the backend once a line-up with them has been read
                    error: err.response?.status === 404
                        ? 'notFound'
                        : err.response?.data?.message || 'Could not load this artist. Is the backend running?',
                })
            })
        return () => controller.abort()
    }, [slug, attempt])

    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/artists'))
    const loading = !artist && !error
    const unknown = error === 'notFound' && !onMap
    const links = profile ? PROFILE_LINKS.filter(([key]) => profile[key]) : []
    const searches = SEARCH_LINKS.filter(([key]) => !profile?.[key])
    const firstGenre = genres[0]?.id

    return (
        <div className="page">
            <button onClick={goBack} className="back-link">← Back</button>

            {/* Who they are */}
            <div className="panel mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="artist-head min-w-0">
                    {profile?.photoUrl ? (
                        <img className="artist-head__photo" src={profile.photoUrl} alt={name} loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="artist-head__photo artist-head__initials" aria-hidden="true">{initials(name)}</div>
                    )}
                    <div className="min-w-0">
                        <div className="page-head__tag">// Satellite · artist{origin ? ` · ${origin}` : ''}</div>
                        <h1 className="page-title">{name}</h1>
                        {(genres.length > 0 || role) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {role && (
                                    <span className="badge" title={role.guessed ? 'Guessed from the map and the line-ups' : 'Picked by the artist'}>
                                        {ROLE_LABELS[role.role]}
                                    </span>
                                )}
                                {genres.map(g => (
                                    <Link key={g.id} className="genre-chip no-underline" style={{ '--c': data.families[g.family].color }}
                                        to={`/?genre=${g.id}&artist=${encodeURIComponent(mapName)}`}>
                                        {g.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                        {artist?.followers > 0 && (
                            <p className="mono text-xs muted mt-2 mb-0">★ {artist.followers} {artist.followers === 1 ? 'follower' : 'followers'}</p>
                        )}
                        {(links.length > 0 || searches.length > 0 || profile?.bookingEmail) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 mono text-xs">
                                {links.map(([key, label]) => (
                                    <a key={key} className="link" href={profile[key]} target="_blank" rel="noopener noreferrer">{label} ↗</a>
                                ))}
                                {searches.map(([key, label, url]) => (
                                    <a key={key} className="link" href={url(name)} target="_blank" rel="noopener noreferrer"
                                        title={`Find ${name} on ${label}`}>{label} ↗</a>
                                ))}
                                {profile?.bookingEmail && (
                                    <a className="link" href={`mailto:${profile.bookingEmail}?subject=${encodeURIComponent(`Booking: ${name}`)}`}>✉ Booking</a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    {/* Only artists from the line-ups can be followed: they are the ones with gigs */}
                    {artist && <FollowButton slug={artist.slug} name={artist.name} />}
                    {firstGenre && (
                        <Link className="btn" to={`/?genre=${firstGenre}&artist=${encodeURIComponent(mapName)}`}>◎ View on the map</Link>
                    )}
                    {canEdit && (
                        <Link className="btn btn--ghost" to={`/artists/${encodeURIComponent(artist.slug)}/edit`}>✎ Edit profile</Link>
                    )}
                    <Link className="btn btn--ghost" title="Wrong name, genre or not an artist? Tell us"
                        to={`/feedback?${new URLSearchParams({ kind: 'CORRECTION', about: 'ARTIST', ref: name, from: `/artists/${slug}` })}`}>
                        ✎ Report
                    </Link>
                </div>
            </div>

            {unknown ? (
                <div className="empty">
                    <p><strong>We don't know {name} yet.</strong></p>
                    <p>
                        Artists show up here once a line-up with them has been read, so check back later or{' '}
                        <Link to="/artists" className="link">browse all artists</Link>.
                    </p>
                </div>
            ) : error && error !== 'notFound' ? (
                <div className="py-8 grid justify-items-center gap-3">
                    <p className="notice m-0">{error}</p>
                    <button onClick={() => setAttempt(count => count + 1)} className="btn">Try again</button>
                </div>
            ) : (
                <>
                    {profile?.bio && (
                        <Section label="About">
                            <p className="soft whitespace-pre-line m-0 max-w-3xl">{profile.bio}</p>
                        </Section>
                    )}

                    {(ownTracks.length > 0 || tracks.length > 0 || albums.length > 0 || labels.length > 0 || ownFestivals.length > 0 || festivals.length > 0) && (
                        <Section label="Sound">
                            <div className="artist-sound">
                                {ownTracks.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Tracks</h3>
                                        <ul className="list-none p-0 m-0 text-sm grid gap-1">
                                            {ownTracks.map(t => (
                                                <li key={t.url}>
                                                    <a className="link" href={t.url} target="_blank" rel="noopener noreferrer">▶ {t.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {tracks.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Tracks</h3>
                                        <ul className="list-none p-0 m-0 text-sm grid gap-1">
                                            {tracks.map(t => (
                                                <li key={`${t.artist}|${t.title}`}>
                                                    <a className="link" href={youtubeLink(t)} target="_blank" rel="noopener noreferrer">▶ {t.title}</a>
                                                    {t.artist !== mapName && <span className="muted"> · {t.artist}</span>}
                                                    {t.year && <span className="muted mono text-xs"> {t.year}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {albums.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Albums</h3>
                                        <ul className="list-none p-0 m-0 text-sm grid gap-1 soft">
                                            {albums.slice(0, 8).map(a => <li key={a.title}>{a.title} <span className="muted mono text-xs">{a.year}</span></li>)}
                                        </ul>
                                    </div>
                                )}
                                {labels.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Labels</h3>
                                        <ul className="list-none p-0 m-0 text-sm grid gap-1">
                                            {labels.map(l => (
                                                <li key={l}><Link className="link" to={`/labels/${encodeURIComponent(l)}`}>{l}</Link></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {(ownFestivals.length > 0 || festivals.length > 0) && (
                                    <div>
                                        <h3 className="field-label">Festivals played</h3>
                                        <ul className="list-none p-0 m-0 text-sm grid gap-1">
                                            {ownFestivals.map(f => (
                                                <li key={`${f.name}|${f.year}`}>
                                                    {f.url
                                                        ? <a className="link" href={f.url} target="_blank" rel="noopener noreferrer">▶ {f.name}</a>
                                                        : <span className="soft">{f.name}</span>}
                                                    {f.year && <span className="muted mono text-xs"> {f.year}</span>}
                                                </li>
                                            ))}
                                            {festivals.map(x => (
                                                <li key={x.festival}>
                                                    {x.video ? (
                                                        <a className="link" href={`https://www.youtube.com/watch?v=${x.video}`} target="_blank" rel="noopener noreferrer">
                                                            ▶ {festivalById[x.festival].name}
                                                        </a>
                                                    ) : (
                                                        <Link className="link" to={`/?festival=${x.festival}`}>{festivalById[x.festival].name}</Link>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {loading ? (
                        <p className="mono text-xs muted">Loading gigs…</p>
                    ) : artist && (
                        <>
                            <Section label={`Next gigs · ${artist.upcomingEvents.length}`}>
                                {artist.upcomingEvents.length === 0 ? (
                                    <p className="muted text-sm m-0">No upcoming gigs right now.</p>
                                ) : (
                                    <ul className="rows">
                                        {artist.upcomingEvents.map(event => (
                                            <li key={event.id}>
                                                <Link to={`/events/${event.id}`} state={{ event }} className="rows__item">
                                                    <span className="rows__name">
                                                        <span className="mono text-xs muted artist-gig__day">{day(event.dateStart, GIG_DAY)}</span>
                                                        {event.nameParty}
                                                    </span>
                                                    <span className="rows__meta">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>

                            {artist.pastEvents?.length > 0 && (
                                <Section label={`Played before · ${artist.pastEvents.length}`}>
                                    <ul className="rows">
                                        {artist.pastEvents.map(gig => (
                                            <li key={gig.eventId} className="rows__item">
                                                <span className="rows__name">{gig.name}</span>
                                                <span className="rows__meta">
                                                    {[day(gig.dateStart, PAST_DAY), gig.town, gig.country].filter(Boolean).join(' · ')}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            )}
                            <ArtistNumbers slug={artist.slug} />
                        </>
                    )}
                </>
            )}
            {artist && !canEdit && <div className="mt-2"><ClaimPage kind="ARTIST" target={artist.slug} name={artist.name} /></div>}
        </div>
    )
}

export default Artist
