import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    fetchAdminEventGenres, fetchEventsPage, fetchTimetable, handBackTimetable, setAdminEventGenres, setAdminTimetable, setFeedbackStatus,
} from '../api/backend.js'
import { data, genreById } from '../map/data/types'
import AdminTabs from '../components/AdminTabs'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

// Genres grouped by scene, for the "add genre" picker
const SCENES = Object.entries(data.families).map(([id, family]) => ({
    name: family.name,
    genres: data.genres.filter(g => g.family === id),
}))
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
                {event.genres.map(g => {
                    const genre = genreById[g.genreId]
                    const color = genre ? data.families[genre.family].color : 'var(--muted)'
                    return (
                        <span key={g.genreId} className="genre-chip inline-flex items-center gap-2" style={{ '--c': color }}
                            title={`${Math.round(g.share * 100)}% · ${SOURCE_TEXT[g.source]}`}>
                            {genre?.name ?? g.genreId} {Math.round(g.share * 100)}%
                            <button type="button" disabled={saving} aria-label={`Remove ${genre?.name ?? g.genreId}`}
                                className="bg-transparent border-0 p-0 cursor-pointer" style={{ color }}
                                onClick={() => save(ids.filter(x => x !== g.genreId))}>✕</button>
                        </span>
                    )
                })}
                <select className="field admin-artist__add" value="" disabled={saving} aria-label="Add a genre"
                    onChange={(e) => e.target.value && save([...ids, e.target.value])}>
                    <option value="">+ Add genre</option>
                    {SCENES.map(scene => (
                        <optgroup key={scene.name} label={scene.name}>
                            {scene.genres.filter(g => !ids.includes(g.id)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </optgroup>
                    ))}
                </select>
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {event.manual && (
                <button className="btn mt-3" disabled={saving} onClick={() => save([])}>Back to the line-up</button>
            )}
            <p className="muted text-sm mb-0 mt-3">
                Hand-set genres are shared equally and stay until you hand the event back to its line-up.
            </p>
            {error && <p className="notice mt-3 mb-0">{error}</p>}
        </div>
    )
}

// Venue-clock times: the API sends "2026-10-24T22:00:00", a datetime-local field wants "2026-10-24T22:00"
const toField = (value) => (value ? value.slice(0, 16) : '')
const emptySet = (startsAt = '') => ({ stage: '', artist: '', startsAt, endsAt: '', genreId: '' })

// The event's timetable: what was read from the line-up, to correct, or a new one written from scratch.
// Saving makes it hand-set (the line-up no longer changes it); "Back to the line-up" undoes that.
function TimetableEditor({ id, onSaved }) {
    const [timetable, setTimetable] = useState(null)
    const [rows, setRows] = useState([])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)

    const show = (found) => {
        setTimetable(found)
        setRows(found.sets.map(s => ({ stage: s.stage || '', artist: s.artist, startsAt: toField(s.startsAt), endsAt: toField(s.endsAt), genreId: s.genreId || '' })))
        setDirty(false)
    }

    useEffect(() => {
        const controller = new AbortController()
        fetchTimetable(id, controller.signal)
            .then(show)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the timetable.') })
        return () => controller.abort()
    }, [id])

    const change = (i, field, value) => {
        setRows(prev => prev.map((row, j) => (j === i ? { ...row, [field]: value } : row)))
        setDirty(true)
    }
    const add = () => {
        // A new set starts where the last one ends, which is how most timetables run
        const last = rows[rows.length - 1]
        setRows(prev => [...prev, { ...emptySet(last?.endsAt || ''), stage: last?.stage || '' }])
        setDirty(true)
    }
    const remove = (i) => {
        setRows(prev => prev.filter((_, j) => j !== i))
        setDirty(true)
    }

    const run = async (action) => {
        setSaving(true)
        setError('')
        try {
            show(await action())
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setSaving(false)
        }
    }
    const save = () => run(() => setAdminTimetable(id, rows.map(r => ({
        stage: r.stage.trim() || null,
        artist: r.artist.trim(),
        startsAt: r.startsAt || null,
        endsAt: r.endsAt || null,
        genreId: r.genreId || null,
    }))))

    if (error && !timetable) return <p className="notice">{error}</p>
    if (!timetable) return <p className="mono text-xs muted">Loading the timetable…</p>

    return (
        <div className="panel mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="field-label m-0">Timetable</span>
                <span className="badge">
                    {timetable.manual ? 'Set by hand' : timetable.sets.length ? 'From the line-up' : 'No set times in the line-up'}
                </span>
            </div>
            {rows.length > 0 && (
                <div className="grid gap-2 mb-3">
                    {rows.map((row, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                            <input className="field w-auto" placeholder="Stage" value={row.stage} aria-label="Stage"
                                onChange={(e) => change(i, 'stage', e.target.value)} />
                            <input className="field w-auto" placeholder="Artist" value={row.artist} aria-label="Artist"
                                onChange={(e) => change(i, 'artist', e.target.value)} />
                            <input className="field w-auto" type="datetime-local" value={row.startsAt} aria-label="Starts"
                                onChange={(e) => change(i, 'startsAt', e.target.value)} />
                            <span className="muted">–</span>
                            <input className="field w-auto" type="datetime-local" value={row.endsAt} aria-label="Ends (optional)"
                                onChange={(e) => change(i, 'endsAt', e.target.value)} />
                            {/* The set's genre sends its ship of the live fleet to that star */}
                            <select className="field w-auto" value={row.genreId} aria-label="Genre of the set"
                                onChange={(e) => change(i, 'genreId', e.target.value)}>
                                <option value="">Genre: none</option>
                                {SCENES.map(scene => (
                                    <optgroup key={scene.name} label={scene.name}>
                                        {scene.genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <button className="btn btn--ghost" onClick={() => remove(i)} aria-label={`Remove ${row.artist || 'this set'}`}>✕</button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={add} disabled={saving}>+ Add set</button>
                {dirty && (
                    <button className="btn btn--primary" onClick={save} disabled={saving}>
                        {saving ? 'Saving…' : 'Save timetable'}
                    </button>
                )}
                {timetable.manual && !dirty && (
                    <button className="btn" onClick={() => run(() => handBackTimetable(id))} disabled={saving}>Back to the line-up</button>
                )}
            </div>
            <p className="muted text-sm mb-0 mt-3">
                Times on the clock at the venue. The end is optional. A saved timetable stays until you hand it back.
            </p>
            {error && <p className="notice mt-3 mb-0">{error}</p>}
        </div>
    )
}

// Admin panel: find an event and set its map genres by hand when its line-up doesn't tell.
// Opened from the feedback inbox as /admin/events?id=118537&feedback=7
function AdminEvents() {
    usePageMeta({ title: 'Event genres', path: '/admin/events', noindex: true })
    const { user } = useAuth()
    const [params, setParams] = useSearchParams()
    const selected = params.get('id')
    const feedbackId = params.get('feedback')
    const [search, setSearch] = useState('')
    const debounced = useDebouncedValue(search.trim(), 300)
    const [result, setResult] = useState({ search: null, events: [], error: null })
    const [fixed, setFixed] = useState(false)
    const [feedbackState, setFeedbackState] = useState('open')

    useEffect(() => {
        if (!user?.admin || debounced.length < 2) return
        const controller = new AbortController()
        fetchEventsPage({ page: 0, size: 20, search: debounced, timeline: 'ALL' }, controller.signal)
            .then(page => setResult({ search: debounced, events: page.content, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) setResult({ search: debounced, events: [], error: err.response?.data?.message || 'Could not search.' })
            })
        return () => controller.abort()
    }, [debounced, user?.admin])

    if (!user?.admin) {
        return <div className="page page--narrow"><p className="notice">This page is for admins.</p></div>
    }

    const markDone = async () => {
        setFeedbackState('saving')
        try {
            await setFeedbackStatus(feedbackId, 'DONE')
            setFeedbackState('done')
        } catch {
            setFeedbackState('error')
        }
    }

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

            {feedbackId && (
                <div className="panel mb-6" style={{ '--fam': 'var(--gold)' }}>
                    {feedbackState === 'done' ? (
                        <p className="m-0">Feedback #{feedbackId} is marked as done. <Link className="link" to="/admin/feedback">Back to the inbox →</Link></p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <span>{fixed ? `Saved. Is feedback #${feedbackId} sorted now?` : `Fixing feedback #${feedbackId}.`}</span>
                            {fixed && (
                                <button className="btn btn--primary" onClick={markDone} disabled={feedbackState === 'saving'}>
                                    {feedbackState === 'saving' ? 'Saving…' : 'Mark as done'}
                                </button>
                            )}
                            {feedbackState === 'error' && <span className="notice m-0">Could not change the status. Try again.</span>}
                        </div>
                    )}
                </div>
            )}

            {selected && <EventEditor key={selected} id={selected} onSaved={() => setFixed(true)} />}
            {selected && <TimetableEditor key={'tt' + selected} id={selected} onSaved={() => setFixed(true)} />}

            <div className="panel mb-6">
                <label htmlFor="admin-event-search" className="field-label">Find another event</label>
                <input id="admin-event-search" type="text" className="field" value={search} autoFocus={!selected}
                    placeholder="Ozora, Forest Gathering..." onChange={(e) => setSearch(e.target.value)} />
            </div>

            {debounced.length >= 2 && (
                result.error ? <p className="notice">{result.error}</p>
                    : result.search !== debounced ? <p className="mono text-xs muted">Searching…</p>
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
