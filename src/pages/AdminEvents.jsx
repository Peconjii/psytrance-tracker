import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    fetchAdminEventGenres, fetchEventsPage, handBackTimetable, setAdminEventGenres, setAdminTimetable,
} from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import { AddGenre, FeedbackBanner, GenreChip } from '../components/AdminParts'
import TimetableEditor from '../components/TimetableEditor.jsx'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

const SOURCE_TEXT = { MANUAL: 'set by hand', ARTIST: 'artists on the map', STAGE: 'stage names', KEYWORD: "organizer's pick" }

// One event's genres: hand-set ones can be removed one by one, and any genre can be added. The first change
// turns the event into hand-set genres (the line-up no longer decides); "Back to the line-up" undoes that.
function EventEditor({ id, onSaved }) {
    const [event, setEvent] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // A new event gets a fresh editor (the parent keys it by id), so there is no old state to clear here
    useEffect(() => {
        const controller = new AbortController()
        fetchAdminEventGenres(id, controller.signal)
            .then(setEvent)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the event.') })
        return () => controller.abort()
    }, [id])

    const save = async (genres) => {
        setSaving(true)
        setError('')
        try {
            setEvent(await setAdminEventGenres(id, genres))
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setSaving(false)
        }
    }

    if (error && !event) return <p className="notice">{error}</p>
    if (!event) return <p className="mono text-xs muted">Loading…</p>

    const ids = event.genres.map(g => g.genreId)
    return (
        <div className="panel mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-medium">{event.nameParty}</span>
                <span className="badge">{event.manual ? 'Set by hand' : 'From the line-up'}</span>
                <Link className="link mono text-xs ml-auto" to={`/events/${id}`}>Event page →</Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {event.genres.length === 0 && <span className="muted text-sm">No genre yet: the ship waits in the harbour</span>}
                {event.genres.map(g => (
                    <GenreChip key={g.genreId} id={g.genreId} disabled={saving}
                        title={`${Math.round(g.share * 100)}% · ${SOURCE_TEXT[g.source]}`}
                        // An empty list means "back to the line-up", so the last genre can't be removed:
                        // add the right one first, or hand the event back
                        onRemove={ids.length > 1 ? () => save(ids.filter(x => x !== g.genreId)) : undefined}>
                        {' '}{Math.round(g.share * 100)}%
                    </GenreChip>
                ))}
                <AddGenre exclude={ids} disabled={saving} onAdd={(id) => save([...ids, id])} />
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {event.manual && (
                <button className="btn mt-3" disabled={saving} onClick={() => save([])}>Back to the line-up</button>
            )}
            <p className="muted text-sm mb-0 mt-3">
                Hand-set genres are shared equally and stay until you hand the event back to its line-up.
                {ids.length === 1 && ' To replace the only genre, add the right one first, then remove the wrong one.'}
            </p>
            {error && <p className="notice mt-3 mb-0">{error}</p>}
        </div>
    )
}

// Admin panel: find an event and set its map genres by hand when its line-up doesn't tell.
// Opened from the feedback inbox as /admin/events?id=118537&feedback=7
function AdminEvents() {
    usePageMeta({ title: 'Event genres', path: '/admin/events', noindex: true })
    const [params, setParams] = useSearchParams()
    const selected = params.get('id')
    const feedbackId = params.get('feedback')
    const [search, setSearch] = useState('')
    const debounced = useDebouncedValue(search.trim(), 300)
    const [result, setResult] = useState({ search: null, events: [], error: null })
    // The event something was saved for: picking another event starts over
    const [savedFor, setSavedFor] = useState(null)

    useEffect(() => {
        if (debounced.length < 2) return
        const controller = new AbortController()
        fetchEventsPage({ page: 0, size: 20, search: debounced, timeline: 'ALL' }, controller.signal)
            .then(page => setResult({ search: debounced, events: page.content, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) setResult({ search: debounced, events: [], error: err.response?.data?.message || 'Could not search.' })
            })
        return () => controller.abort()
    }, [debounced])

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · ship registry</div>
                <h1 className="page-title">Events</h1>
                <p className="page-head__sub">
                    Set the genres of an event by hand when its line-up says nothing or the wrong thing. The ship moves
                    on the map at once, and reading the line-up again won't change it back.
                </p>
            </header>
            <AdminTabs />

            {feedbackId && <FeedbackBanner feedbackId={feedbackId} fixed={savedFor !== null && savedFor === selected} />}

            {selected && <EventEditor key={selected} id={selected} onSaved={() => setSavedFor(selected)} />}
            {selected && <TimetableEditor key={'tt' + selected} id={selected} save={setAdminTimetable} handBack={handBackTimetable}
                onSaved={() => setSavedFor(selected)} />}

            <div className="panel mb-6">
                <label htmlFor="admin-event-search" className="field-label">Find another event</label>
                <input id="admin-event-search" type="text" className="field" value={search} autoFocus={!selected}
                    placeholder="Ozora, Forest Gathering..." onChange={(e) => setSearch(e.target.value)} />
            </div>

            {debounced.length >= 2 && (
                result.search !== debounced ? <p className="mono text-xs muted">Searching…</p>
                    : result.error ? <p className="notice">{result.error}</p>
                        : result.events.length === 0 ? <div className="empty"><p><strong>No upcoming event with that name.</strong></p></div>
                            : (
                                <ul className="rows">
                                    {result.events.map(e => (
                                        <li key={e.id} className="rows__item">
                                            <button className="bg-transparent border-0 p-0 text-left cursor-pointer w-full flex flex-wrap items-center gap-3"
                                                onClick={() => { setParams(feedbackId ? { id: e.id, feedback: feedbackId } : { id: e.id }); setSearch('') }}>
                                                <span className="font-medium">{e.nameParty}</span>
                                                <span className="mono text-xs muted ml-auto">{e.dateStart} · {e.nameTown}, {e.nameCountry} · #{e.id}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )
            )}
        </div>
    )
}

export default AdminEvents
