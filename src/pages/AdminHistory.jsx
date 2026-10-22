import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminChanges, undoAdminChange } from '../api/backend.js'
import { reloadPlacementsLater } from '../map/data/placements'
import AdminTabs from '../components/AdminTabs'
import usePageMeta from '../hooks/usePageMeta.js'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const KIND_LABELS = { ARTIST_GENRES: 'Artist genres', EVENT_GENRES: 'Event genres', ARTIST_HIDDEN: 'Not an artist', ARTIST_MERGED: 'Merged', EVENT_TIMETABLE: 'Timetable', ARTIST_PROFILE: 'Artist profile', ARTIST_TRACKS: 'Artist tracks', ARTIST_FESTIVALS: 'Artist festivals', ARTIST_OWNER: 'Profile owner', ARTIST_NAME: 'Artist name', ARTIST_ROLE: 'Artist role', ORGANIZER_PROFILE: 'Organizer page', ORGANIZER_OWNER: 'Organizer owner', OUR_EVENT: 'Added event', OUR_EVENT_EDITED: 'Added event changed', REVIEW_DELETED: 'Review deleted', EVENT_HIDDEN: 'Event hidden', EVENT_FEATURED: 'Event featured' }
// Merges move events between artists, and timetables and profiles are too long to keep a copy of: none can be undone
const NO_UNDO = ['ARTIST_MERGED', 'EVENT_TIMETABLE', 'ARTIST_PROFILE', 'ARTIST_TRACKS', 'ARTIST_FESTIVALS', 'ARTIST_OWNER', 'ARTIST_NAME', 'ARTIST_ROLE', 'ORGANIZER_PROFILE', 'ORGANIZER_OWNER', 'OUR_EVENT', 'OUR_EVENT_EDITED', 'REVIEW_DELETED', 'EVENT_HIDDEN', 'EVENT_FEATURED']
// An empty value means: the artist isn't on the map, or the event's genres come from its line-up
const EMPTY = { ARTIST_GENRES: 'not on the map', EVENT_GENRES: 'from the line-up', ARTIST_PROFILE: 'empty', ARTIST_TRACKS: 'none', ARTIST_FESTIVALS: 'none', ARTIST_OWNER: 'nobody', ARTIST_NAME: 'the line-up name', ARTIST_ROLE: 'guessed', ORGANIZER_OWNER: 'nobody', REVIEW_DELETED: 'deleted', EVENT_FEATURED: 'not featured' }
// Event changes are about "<id> · <name>"
const targetLink = (change) => change.kind.startsWith('EVENT_')
    ? `/admin/events?id=${change.target.split(' ')[0]}`
    : `/admin/genres?artist=${encodeURIComponent(change.target)}`

// Every change made in the admin panel, newest first, with an undo for each one that still stands.
// The backend refuses an undo that would throw away a newer change of the same artist.
function AdminHistory() {
    usePageMeta({ title: 'Admin history', path: '/admin/history', noindex: true })
    const [changes, setChanges] = useState(null)
    const [error, setError] = useState('')
    const [undoing, setUndoing] = useState(null)

    const load = (signal) => fetchAdminChanges(signal)
        .then(setChanges)
        .catch(err => { if (!signal?.aborted) setError(err.response?.data?.message || 'Could not load the history.') })

    useEffect(() => {
        const controller = new AbortController()
        load(controller.signal)
        return () => controller.abort()
    }, [])

    const undo = async (change) => {
        setUndoing(change.id)
        setError('')
        try {
            await undoAdminChange(change.id)
            reloadPlacementsLater()
            await load()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not undo. Try again.')
        } finally {
            setUndoing(null)
        }
    }

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · ship's log</div>
                <h1 className="page-title">History</h1>
                <p className="page-head__sub">
                    Every change made in the admin panel. Undo puts back what a change replaced, as a new change of
                    its own. If the same artist was changed again later, undo the newer change first.
                </p>
            </header>
            <AdminTabs />

            {error && <p className="notice mb-4">{error}</p>}

            {changes === null ? (
                <p className="mono text-xs muted">Loading...</p>
            ) : changes.length === 0 ? (
                <div className="empty"><p><strong>No changes yet.</strong></p></div>
            ) : (
                <ul className="rows">
                    {changes.map(change => (
                        <li key={change.id} className="rows__item">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="badge">{KIND_LABELS[change.kind] ?? change.kind}</span>
                                <Link className="link font-medium" to={targetLink(change)}>
                                    {change.target}
                                </Link>
                                {change.undoOf && <span className="badge">Undo of #{change.undoOf}</span>}
                                {change.undoneBy && <span className="badge">Undone by #{change.undoneBy}</span>}
                                <span className="mono text-xs muted ml-auto">
                                    #{change.id} · @{change.username} · {DATE.format(new Date(change.createdAt))}
                                </span>
                            </div>
                            <p className="soft m-0">
                                <span className="muted">{change.before || EMPTY[change.kind]}</span>
                                {' → '}
                                <strong>{change.after || EMPTY[change.kind]}</strong>
                            </p>
                            {/* Merges move events between artists and can't be taken apart again */}
                            {!change.undoneBy && !NO_UNDO.includes(change.kind) && (
                                <div>
                                    <button className="btn" disabled={undoing !== null} onClick={() => undo(change)}>
                                        {undoing === change.id ? 'Undoing…' : 'Undo'}
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default AdminHistory
