import { useEffect, useState } from 'react'
import { fetchTimetable } from '../api/backend.js'
import { GenreOptions } from './AdminParts'

// Venue-clock times: the API sends "2026-10-24T22:00:00", a datetime-local field wants "2026-10-24T22:00"
const toField = (value) => (value ? value.slice(0, 16) : '')
const emptySet = (startsAt = '') => ({ stage: '', artist: '', startsAt, endsAt: '', genreId: '' })

// The event's timetable: what was read from the line-up, to correct, or a new one written from scratch.
// Saving makes it hand-set (the line-up no longer changes it); "Back to the line-up" undoes that.
// `save(id, sets)` and `handBack(id)` call the backend: the admin's endpoints, or the organizer's for their events.
function TimetableEditor({ id, save, handBack, onSaved = () => {} }) {
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
    const saveRows = () => run(() => save(id, rows.map(r => ({
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
                                <GenreOptions />
                            </select>
                            <button className="btn btn--ghost" onClick={() => remove(i)} aria-label={`Remove ${row.artist || 'this set'}`}>✕</button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={add} disabled={saving}>+ Add set</button>
                {dirty && (
                    <button className="btn btn--primary" onClick={saveRows} disabled={saving}>
                        {saving ? 'Saving…' : 'Save timetable'}
                    </button>
                )}
                {timetable.manual && !dirty && (
                    <button className="btn" onClick={() => run(() => handBack(id))} disabled={saving}>Back to the line-up</button>
                )}
            </div>
            <p className="muted text-sm mb-0 mt-3">
                Times on the clock at the venue. The end is optional. A saved timetable stays until you hand it back.
            </p>
            {error && <p className="notice mt-3 mb-0">{error}</p>}
        </div>
    )
}

export default TimetableEditor
