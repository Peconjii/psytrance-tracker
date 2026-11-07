import { useEffect, useState } from 'react'
import { fetchTimetable } from '../api/backend.js'
import { AddGenre, GenreChip, GenreOptions } from './AdminParts'
import ArtistInput from './ArtistInput.jsx'
import { MAX_STAGE_GENRES, stageParts, stageWithGenres } from './stageText.js'
import { toField } from '../dates.js'

// Venue-clock times: the API sends "2026-10-24T22:00:00", a datetime-local field wants "2026-10-24T22:00"
const emptySet = (startsAt = '') => ({ stage: '', artist: '', startsAt, endsAt: '', genreId: '' })

// The event's timetable: what was read from the line-up, to correct, or a new one written from scratch.
// As in the event form, a stage has up to four genres, kept in brackets after its name ("Main (Forest, Goa trance)"),
// and the first stage is the main one; a set can still get its own genre.
// Saving makes it hand-set (the line-up no longer changes it); "Back to the line-up" undoes that.
// `save(id, sets)` and `handBack(id)` call the backend: the admin's endpoints, or the organizer's for their events.
// `setGenres(id, genres)`: when given, "★ Ship by the main stage" sets the event's genres (where its ship flies) to the
// main stage's.
function TimetableEditor({ id, save, handBack, setGenres, onSaved = () => {} }) {
    const [timetable, setTimetable] = useState(null)
    const [rows, setRows] = useState([])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [shipNote, setShipNote] = useState('')

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
    // The sets by stage, in the order the stages first come: [{ stage (as stored), name, genreIds, rows: [index] }]
    const groups = []
    rows.forEach((row, i) => {
        let group = groups.find(x => x.stage === row.stage)
        if (!group) groups.push(group = { stage: row.stage, ...stageParts(row.stage), rows: [] })
        group.rows.push(i)
    })

    const add = (stage) => {
        // A new set starts where the stage's last one ends, which is how most timetables run
        const last = [...rows].reverse().find(r => r.stage === stage)
        const at = rows.lastIndexOf(last) + 1
        setRows(prev => [...prev.slice(0, at), { ...emptySet(last?.endsAt || ''), stage, genreId: last?.genreId || '' }, ...prev.slice(at)])
        setDirty(true)
    }
    const addStage = () => {
        const names = new Set(rows.map(r => r.stage))
        let n = groups.length + 1
        while (names.has(`Stage ${n}`)) n++
        setRows(prev => [...prev, { ...emptySet(prev[prev.length - 1]?.startsAt || ''), stage: prev.length ? `Stage ${n}` : '' }])
        setDirty(true)
    }
    const renameStage = (from, to) => {
        setRows(prev => prev.map(r => (r.stage === from ? { ...r, stage: to } : r)))
        setDirty(true)
    }
    const setStageGenres = (group, genreIds) => renameStage(group.stage, stageWithGenres(group.name, genreIds))
    // The main stage goes first
    const makeMain = (stage) => {
        setRows(prev => [...prev.filter(r => r.stage === stage), ...prev.filter(r => r.stage !== stage)])
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
    // The main stage's genres (the first stage), for "★ Ship by the main stage"
    const mainGenres = groups[0]?.genreIds ?? []
    const shipByMain = async () => {
        setSaving(true)
        setError('')
        try {
            await setGenres(id, mainGenres.slice(0, 4))
            setShipNote('The ship now flies by the main stage.')
            onSaved()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not set the genres. Try again.')
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
            {groups.length > 0 && (
                <div className="grid gap-3 mb-3">
                    {groups.map((group, g) => (
                        <div key={g} className="stage-card">
                            {groups.length > 1 && (
                                <div className="flex items-center gap-2 mb-2 mono text-xs">
                                    {g === 0
                                        ? <span style={{ color: 'var(--accent)' }}>★ Main stage</span>
                                        : <button type="button" className="link bg-transparent border-0 p-0 cursor-pointer" onClick={() => makeMain(group.stage)}>☆ Make it the main stage</button>}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <input className="field flex-1 min-w-40" placeholder="Stage (optional)" value={group.name} maxLength={60}
                                    aria-label={`Name of stage ${g + 1}`}
                                    onChange={(e) => renameStage(group.stage, stageWithGenres(e.target.value, group.genreIds))} />
                            </div>
                            {/* The stage's genres: its sets of artists the map doesn't place fly to the first one */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="mono text-xs muted">Stage genres:</span>
                                {group.genreIds.map(id => (
                                    <GenreChip key={id} id={id} onRemove={() => setStageGenres(group, group.genreIds.filter(x => x !== id))} />
                                ))}
                                {group.genreIds.length < MAX_STAGE_GENRES && (
                                    <AddGenre exclude={group.genreIds} label={`Add a genre to stage ${g + 1}`}
                                        onAdd={(id) => setStageGenres(group, [...group.genreIds, id])} />
                                )}
                            </div>
                            <div className="grid gap-2">
                                {group.rows.map(i => {
                                    const row = rows[i]
                                    return (
                                        <div key={i} className="stage-set">
                                            <input className="field" type="datetime-local" value={row.startsAt} aria-label="Starts"
                                                onChange={(e) => change(i, 'startsAt', e.target.value)} />
                                            <span className="muted">–</span>
                                            <input className="field" type="datetime-local" value={row.endsAt} aria-label="Ends (optional)"
                                                onChange={(e) => change(i, 'endsAt', e.target.value)} />
                                            <span className="stage-set__artist">
                                                <ArtistInput placeholder="Artist" value={row.artist} aria-label="Artist"
                                                    onChange={(artist) => change(i, 'artist', artist)} />
                                                {/* The set's genre sends its ship of the live fleet to that star */}
                                                <select className="field" value={row.genreId} aria-label="Genre of the set"
                                                    onChange={(e) => change(i, 'genreId', e.target.value)}>
                                                    <option value="">Genre: as the stage / artist</option>
                                                    <GenreOptions />
                                                </select>
                                                <button className="btn btn--ghost shrink-0" onClick={() => remove(i)}
                                                    aria-label={`Remove ${row.artist || 'this set'}`}>✕</button>
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                            <button className="btn mt-2" onClick={() => add(group.stage)} disabled={saving}>+ Add set</button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={addStage} disabled={saving}>{rows.length ? '+ Add stage' : '+ Add set'}</button>
                {dirty && (
                    <button className="btn btn--primary" onClick={saveRows} disabled={saving}>
                        {saving ? 'Saving…' : 'Save timetable'}
                    </button>
                )}
                {timetable.manual && !dirty && (
                    <button className="btn" onClick={() => run(() => handBack(id))} disabled={saving}>Back to the line-up</button>
                )}
                {setGenres && !dirty && mainGenres.length > 0 && (
                    <button className="btn" onClick={shipByMain} disabled={saving}
                        title="The event's genres (where its ship flies on the map) become the main stage's">
                        ★ Ship by the main stage
                    </button>
                )}
                {shipNote && <span className="mono text-xs" style={{ color: 'var(--accent)' }}>✓ {shipNote}</span>}
            </div>
            <p className="muted text-sm mb-0 mt-3">
                Times on the clock at the venue. The end is optional. A saved timetable stays until you hand it back.
            </p>
            {error && <p className="notice mt-3 mb-0">{error}</p>}
        </div>
    )
}

export default TimetableEditor
