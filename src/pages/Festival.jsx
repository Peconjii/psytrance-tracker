import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchFestivalPage, fetchFestivalStats, fetchMyFestivals } from '../api/backend.js'
import { GenreChip } from '../components/AdminParts'
import StatView, { StatViewToggle } from '../components/StatView.jsx'
import { useOwnedPage } from '../components/ownedPage.js'
import { useStatsView } from '../components/statsView.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { artistSlug } from '../map/data/events'
import { appearances, artistsAtFestival, data, festivalById, genreById } from '../map/data/types'

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// The core of a festival's name, to find its editions among the events: "Hadra Trance Festival" -> "hadra",
// "MoDem (Momento Demento)" -> "modem", "Universo Paralello" stays as it is
function festivalMatch(name) {
    return name.replace(/\(.*?\)/g, '').replace(/\b(trance festival|festival|open air)\b/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// A festival station of the map as a page: what the map knows (sound, sets on video) and what the site counted:
// its editions in the event lists, their line-ups, genres, "I'm going" and saves, and years artists wrote themselves
function Festival() {
    const { id } = useParams()
    const festival = festivalById[id]
    usePageMeta({
        title: festival ? `${festival.name} – Psytrance Festival` : 'Festival',
        description: festival ? `${festival.name}: its sound, sets and editions on Map of Psy.` : undefined,
        path: `/festivals/${id}`,
    })
    const match = festival ? festivalMatch(festival.name) : ''
    const [view, toggleView] = useStatsView()
    const [loaded, setLoaded] = useState({ match: null, stats: null })
    const stats = loaded.match === match ? loaded.stats : null
    // What the festival's owner wrote: their words, links and the organizer who runs it
    const { page, canEdit } = useOwnedPage(fetchFestivalPage, fetchMyFestivals, id, own => own.id === id)
    const profile = page?.profile

    useEffect(() => {
        if (match.length < 3) return
        const controller = new AbortController()
        fetchFestivalStats(match, controller.signal)
            .then(found => setLoaded({ match, stats: found }))
            .catch(() => { if (!controller.signal.aborted) setLoaded({ match, stats: { editions: [], byGenre: [], topArtists: [], reportedByYear: [] } }) })
        return () => controller.abort()
    }, [match])

    if (!festival) {
        return <div className="page"><div className="empty"><p><strong>No festival called {id} on the map.</strong></p></div></div>
    }

    const sets = artistsAtFestival(id).flatMap(name => appearances[name].filter(x => x.festival === id).map(x => ({ name, ...x })))
    const genres = (stats?.byGenre ?? []).filter(g => genreById[g.key]).map(g => {
        const genre = genreById[g.key]
        return { key: g.key, label: genre.name, value: g.count, color: data.families[genre.family].color }
    })

    return (
        <div className="page">
            <div className="panel mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="page-head__tag">// Station · festival</div>
                    <h1 className="page-title">{festival.name}</h1>
                    <p className="mono text-xs muted mt-2 mb-0">{[festival.country, festival.since && `since ${festival.since}`].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Link className="btn btn--ghost" to={`/?festival=${encodeURIComponent(id)}`}>On the map →</Link>
                    {canEdit && <Link className="btn btn--ghost" to={`/festivals/${encodeURIComponent(id)}/edit`}>✎ Edit page</Link>}
                </div>
            </div>

            <section className="panel mb-4">
                <h2 className="panel__label">About</h2>
                <p className="soft m-0 max-w-3xl">{festival.description}</p>
                {profile?.description && (
                    <>
                        <h3 className="field-label mt-4">From the festival</h3>
                        <p className="soft whitespace-pre-line m-0 max-w-3xl">{profile.description}</p>
                    </>
                )}
                <div className="flex flex-wrap gap-2 mt-3">{festival.genres.map(g => <GenreChip key={g} id={g} />)}</div>
                {(page?.organizer || profile?.websiteUrl || profile?.ticketUrl || profile?.instagramUrl) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 mono text-xs">
                        {page?.organizer && (
                            <Link className="link" to={`/organizers/${encodeURIComponent(page.organizer.slug)}`}>Organized by {page.organizer.name} →</Link>
                        )}
                        {[['Tickets', profile?.ticketUrl], ['Website', profile?.websiteUrl], ['Instagram', profile?.instagramUrl]]
                            .filter(([, link]) => link).map(([label, link]) => (
                                <a key={label} className="link" href={link} target="_blank" rel="noopener noreferrer">{label} ↗</a>
                            ))}
                    </div>
                )}
            </section>

            {!stats ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : (
                <>
                    <section className="panel mb-4">
                        <h2 className="panel__label">Editions in the event lists · {stats.editions.length}</h2>
                        {stats.editions.length === 0 ? (
                            <p className="muted text-sm m-0">No event named “{match}” in the lists we read yet.</p>
                        ) : (
                            <ul className="rows">
                                {stats.editions.map(e => (
                                    <li key={e.eventId}>
                                        <Link to={`/events/${e.eventId}`} className="rows__item">
                                            <span className="rows__name">
                                                {e.name}
                                                <span className="block mono text-xs muted">
                                                    {e.dateStart ? DAY.format(new Date(e.dateStart + 'T12:00:00')) : 'Date TBA'}
                                                    {' · '}{[e.town, e.country].filter(Boolean).join(', ')}{e.upcoming ? ' · coming up' : ''}
                                                </span>
                                            </span>
                                            <span className="rows__meta">{e.artists} artists · {e.going} going · {e.saved} saved</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    {(genres.length > 0 || stats.topArtists.length > 0 || stats.reportedByYear.length > 0) && (
                        <section className="panel mb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <h2 className="panel__label m-0">Numbers</h2>
                                <StatViewToggle view={view} onToggle={toggleView} />
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                {genres.length > 0 && (
                                    <div><h3 className="field-label">Sound of the editions</h3><StatView view={view} unit="editions" rows={genres} /></div>
                                )}
                                {stats.topArtists.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Who plays most often</h3>
                                        <StatView view={view} unit="editions" rows={stats.topArtists.map(a => ({ key: a.key, label: a.key, value: a.count }))} />
                                    </div>
                                )}
                                {stats.reportedByYear.length > 0 && (
                                    <div>
                                        <h3 className="field-label">Artists who list it on their profile, by year</h3>
                                        <StatView view={view} unit="artists" rows={stats.reportedByYear.map(y => ({ key: y.key, label: y.key, value: y.count }))} />
                                    </div>
                                )}
                            </div>
                            <p className="mono text-xs muted mt-3 mb-0">Editions are the events whose name has “{match}” as a word.</p>
                        </section>
                    )}
                </>
            )}
            {sets.length > 0 && (
                <section className="panel mb-4">
                    <h2 className="panel__label">Sets on video · {sets.length}</h2>
                    <ul className="list-none p-0 m-0">
                        {sets.map(s => (
                            <li key={s.video} className="grid gap-1 py-2 text-left border-b border-dashed border-[var(--line)] min-w-0">
                                <Link className="link font-medium" to={`/artists/${encodeURIComponent(artistSlug(s.name))}`}>{s.name}</Link>
                                <a className="mono text-xs muted truncate block" href={`https://www.youtube.com/watch?v=${s.video}`}
                                    target="_blank" rel="noopener noreferrer" title={s.title}>
                                    {s.title} ↗
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

export default Festival
