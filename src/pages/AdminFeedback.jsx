import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { acceptFeedback, fetchFeedback, replyToFeedback, setFeedbackStatus } from '../api/backend.js'
import { data } from '../map/data/types'
import { reloadContentLater } from '../map/data/content'
import usePageMeta from '../hooks/usePageMeta.js'
import AdminTabs from '../components/AdminTabs'
import FeedbackReply from '../components/FeedbackReply.jsx'
import { isSitePath } from '../components/sitePath.js'
import { DAY_YEAR_TIME as DATE } from '../dates.js'

const STATUSES = [
    { value: 'NEW', label: 'New' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'DONE', label: 'Done' },
    { value: 'REJECTED', label: 'Rejected' },
]
const KIND_LABELS = { CORRECTION: 'Correction', COMPLAINT: 'Broken', SUGGESTION: 'Improvement', IDEA: 'Idea', OTHER: 'Other' }

// Admins read and sort the feedback here (the route is admin only, see AdminRoute)
function AdminFeedback() {
    usePageMeta({ title: 'Feedback inbox', path: '/admin/feedback', noindex: true })
    const [filter, setFilter] = useState('NEW')
    // Tagged with the filter it belongs to, so switching never shows the old list as the new one
    const [loaded, setLoaded] = useState({ filter: null, items: [], error: null })
    const [saving, setSaving] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchFeedback(filter || null, controller.signal)
            .then(items => setLoaded({ filter, items, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) {
                    setLoaded({ filter, items: [], error: err.response?.data?.message || 'Could not load feedback.' })
                }
            })
        return () => controller.abort()
    }, [filter])

    const changeStatus = async (item, status) => {
        setSaving(item.id)
        try {
            const updated = await setFeedbackStatus(item.id, status)
            setLoaded(prev => ({
                ...prev,
                // Leaves the list when it no longer matches the filter
                items: prev.items.map(i => (i.id === item.id ? updated : i)).filter(i => !filter || i.status === filter),
            }))
        } catch {
            setLoaded(prev => ({ ...prev, error: 'Could not change the status. Try again.' }))
        } finally {
            setSaving(null)
        }
    }

    const loading = loaded.filter !== filter
    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · incoming transmissions</div>
                <h1 className="page-title">Feedback inbox</h1>
            </header>
            <AdminTabs />

            <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Show">
                {[...STATUSES, { value: '', label: 'All' }].map(s => (
                    <button key={s.label} className={`chip${filter === s.value ? ' is-on' : ''}`}
                        aria-pressed={filter === s.value} onClick={() => setFilter(s.value)}>
                        {s.label}
                    </button>
                ))}
            </div>

            {loaded.error && <p className="notice mb-4">{loaded.error}</p>}

            {loading ? (
                <p className="mono text-xs muted">Loading...</p>
            ) : loaded.items.length === 0 ? (
                <div className="empty"><p><strong>Nothing here.</strong></p></div>
            ) : (
                <ul className="grid gap-3 list-none p-0 m-0">
                    {loaded.items.map(item => (
                        <li key={item.id} className="panel" style={item.kind === 'CORRECTION' ? { '--fam': 'var(--gold)' } : undefined}>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="badge">{KIND_LABELS[item.kind]}</span>
                                {item.aboutType && <span className="badge">{item.aboutType.toLowerCase()} · {item.aboutRef}</span>}
                                <span className="mono text-xs muted ml-auto">{DATE.format(new Date(item.createdAt))}</span>
                            </div>
                            <p className="soft whitespace-pre-line break-words mt-0 mb-3">{item.message}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="muted">
                                    {item.username ? `@${item.username}` : 'Guest'}
                                    {item.email && <> · <a className="link" href={`mailto:${item.email}`}>{item.email}</a></>}
                                </span>
                                {isSitePath(item.pageUrl) && <Link className="link mono text-xs" to={item.pageUrl}>Open the page →</Link>}
                                {/* Event feedback is about "<name> (#<id>)" */}
                                {item.aboutType === 'EVENT' && /#(\d+)\)$/.test(item.aboutRef ?? '') && (
                                    <Link className="link mono text-xs"
                                        to={`/admin/events?id=${item.aboutRef.match(/#(\d+)\)$/)[1]}&feedback=${item.id}`}>
                                        Fix in the panel →
                                    </Link>
                                )}
                                {item.aboutType === 'ARTIST' && (
                                    <Link className="link mono text-xs" to={`/admin/genres?artist=${encodeURIComponent(item.aboutRef)}&feedback=${item.id}`}>
                                        Fix in the panel →
                                    </Link>
                                )}
                                {/* Genre feedback is about "<genre>" or, on a key track, "<genre>: <track> by <artist>" */}
                                {item.aboutType === 'GENRE' && genreOfRef(item.aboutRef) && (
                                    <Link className="link mono text-xs" to={`/admin/galaxy?genre=${genreOfRef(item.aboutRef)}`}>
                                        Fix in the panel →
                                    </Link>
                                )}
                                <label className="ml-auto flex items-center gap-2">
                                    <span className="field-label m-0">Status</span>
                                    <select className="field w-auto py-1" value={item.status} disabled={saving === item.id}
                                        onChange={(e) => changeStatus(item, e.target.value)}>
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </label>
                            </div>
                            {item.aboutType === 'EVENT' && /^Event correction · (date|place|name):/m.test(item.message) && (
                                <p className="mono text-xs muted mt-3 mb-0">
                                    Dates, places and names come from Goabase: they change when the organizer fixes them there.
                                    Answer the sender, or check the event in the panel.
                                </p>
                            )}
                            {item.accept && (
                                <AcceptSuggestion item={item}
                                    onAccepted={(updated) => setLoaded(prev => ({
                                        ...prev,
                                        items: prev.items.map(i => (i.id === updated.id ? updated : i)).filter(i => !filter || i.status === filter),
                                    }))} />
                            )}
                            <FeedbackReply item={item}
                                onReplied={(updated) => setLoaded(prev => ({ ...prev, items: prev.items.map(i => (i.id === updated.id ? updated : i)) }))} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// A getter: genres admins added to the galaxy join after the site loads
const GENRE_NAMES = new Proxy({}, { get: (_, id) => data.genres.find(g => g.id === id)?.name })
const genreOfRef = (ref) => {
    const name = (ref ?? '').split(':')[0].trim().toLowerCase()
    return data.genres.find(g => g.name.toLowerCase() === name || g.id === name)?.id ?? null
}

/**
 * "✓ Add track" / "✓ Add to the star" under a suggestion from the feedback form: the track goes into the genre's key
 * tracks (as in Admin -> Galaxy), the artist onto the genre's star (as in Admin -> Artists), and the message is done.
 * Both show up in Admin -> History, where they can be undone.
 */
function AcceptSuggestion({ item, onAccepted }) {
    const { accept } = item
    const track = accept.type === 'TRACK'
    const eventGenres = accept.type === 'EVENT_GENRE'
    // A short thank-you to the sender, when there is an address to write to
    const [thank, setThank] = useState(Boolean(item.replyTo) && !item.replyText)
    const [genreId, setGenreId] = useState(accept.genres[0] ?? '')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const add = async () => {
        setBusy(true)
        setError('')
        try {
            let updated = await acceptFeedback(item.id, eventGenres ? null : genreId)
            reloadContentLater()
            if (thank) {
                try {
                    updated = await replyToFeedback(item.id, thankYou(accept, GENRE_NAMES[genreId] ?? genreId))
                } catch {
                    setError('Added, but the thank-you email could not be sent.')
                }
            }
            setDone(true)
            onAccepted(updated)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not add it. Try again.')
        } finally {
            setBusy(false)
        }
    }

    const what = eventGenres
        ? <>Set the event&apos;s genres to <b>{accept.genres.map(g => GENRE_NAMES[g] ?? g).join(', ')}</b></>
        : track
        ? <><b>{accept.artist}</b> – “{accept.title}”{accept.year ? ` (${accept.year})` : ''}{accept.youtube ? ' · ▶ YouTube' : ' · no YouTube link'}</>
        : <><b>{accept.artist}</b> on the star</>
    return (
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm" style={{ borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
            <span className="mono text-xs muted">{eventGenres ? 'Event genre' : track ? 'Key track' : 'New artist'}:</span>
            <span className="soft">{what}</span>
            {done ? (
                <span className="mono text-xs" style={{ color: 'var(--accent)' }}>✓ Added</span>
            ) : track && accept.addedTo ? (
                // Already among the key tracks (added from here earlier, or by hand in Admin -> Galaxy)
                <span className="mono text-xs" style={{ color: 'var(--accent)' }}>
                    ✓ Already a key track of {GENRE_NAMES[accept.addedTo] ?? accept.addedTo}
                </span>
            ) : accept.genres.length === 0 ? (
                <span className="mono text-xs muted">
                    {track ? `${accept.artist} isn't on the map yet: put them on a star first (Fix in the panel), then add the track.`
                        : 'Already on that star.'}
                </span>
            ) : (
                <>
                    {eventGenres ? null : accept.genres.length > 1 ? (
                        <select className="field w-auto py-1" value={genreId} onChange={(e) => setGenreId(e.target.value)}
                            aria-label="Genre">
                            {accept.genres.map(g => <option key={g} value={g}>{GENRE_NAMES[g] ?? g}</option>)}
                        </select>
                    ) : (
                        <span className="mono text-xs muted">→ {GENRE_NAMES[genreId] ?? genreId}</span>
                    )}
                    {youtubePreview(accept.youtube)}
                    {item.replyTo && !item.replyText && (
                        <label className="flex items-center gap-2 mono text-xs muted">
                            <input type="checkbox" checked={thank} onChange={(e) => setThank(e.target.checked)} />
                            Email a thank-you
                        </label>
                    )}
                    <button type="button" className="btn" onClick={add} disabled={busy}>
                        {busy ? 'Adding…' : eventGenres ? '✓ Set genres' : track ? '✓ Add track' : '✓ Add to the star'}
                    </button>
                </>
            )}
            {error && <span className="notice w-full m-0">{error}</span>}
        </div>
    )
}

// The thank-you the sender gets after an Accept (sent as the inbox's normal answer, so it shows under the message)
function thankYou(accept, genreName) {
    const what = accept.type === 'TRACK' ? `"${accept.title}" by ${accept.artist} is now a key track of ${genreName}`
        : accept.type === 'ARTIST' ? `${accept.artist} now orbits the ${genreName} star`
        : 'the event now shows the genres you suggested'
    return `Thanks for your suggestion: ${what} on Map of Psy. Every fix like yours makes the map truer for everyone. Keep them coming!\n\nhttps://mapofpsy.com`
}

// "Listen" before adding, so a wrong link is caught
function youtubePreview(id) {
    return id ? <a className="link mono text-xs" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">Listen ↗</a> : null
}

export default AdminFeedback
