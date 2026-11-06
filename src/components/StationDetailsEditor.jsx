import { useEffect, useState } from 'react'
import { fetchStationDetails, saveStationDetails } from '../api/backend.js'
import { AddGenre, GenreChip } from './AdminParts'
import { festivalById, labels, genreById } from '../map/data/types'
import { applyStationDetails, loadMapExtras } from '../map/data/extras'
import { errorOf } from './formErrors.js'

// What the map itself says about a label or festival: its name (festivals only: a label's page, followers and
// crew hang on its name), country, first year, description (festivals) and genres. Editors and admins change it,
// and so does the page's owner once an admin trusts them (Trust panel above). Every change is in Admin -> History.
function StationDetailsEditor({ kind, stationKey }) {
    const festival = kind === 'FESTIVAL'
    const [state, setState] = useState(null)   // { canEdit, form }
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        // The map data first, so the form starts from what the map shows now
        Promise.all([loadMapExtras(), fetchStationDetails(kind, stationKey, controller.signal)])
            .then(([, editable]) => {
                const now = festival ? festivalById[stationKey] : labels[stationKey]
                const genres = festival ? (now?.genres ?? [])
                    : Object.values(genreById).filter(g => g.labels.includes(stationKey)).map(g => g.id)
                const form = {
                        name: festival ? (now?.name ?? '') : '',
                        country: now?.country ?? '',
                        since: now?.since ? String(now.since) : '',
                        description: festival ? (now?.description ?? '') : '',
                        genres,
                    }
                // base: what was changed before; loaded: the form as it opened. Only fields edited now are sent
                // changed, so the map files keep giving the rest (and a later fix in them still shows)
                setState({ canEdit: editable.canEdit, form, loaded: form, base: editable.details })
            })
            .catch(err => { if (!controller.signal.aborted) setError(errorOf(err, 'Could not load the map details.')) })
        return () => controller.abort()
    }, [kind, stationKey, festival])

    if (error && !state) return <p className="notice">{error}</p>
    if (!state) return null
    const { form, canEdit } = state
    const set = (field) => (e) => { setState(s => ({ ...s, form: { ...s.form, [field]: e.target.value } })); setMessage(''); setError('') }
    const setGenres = (genres) => { setState(s => ({ ...s, form: { ...s.form, genres } })); setMessage(''); setError('') }

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const { loaded, base } = state
            const pick = (field, value, empty) => {
                const was = loaded[field]
                const same = JSON.stringify(field === 'genres' ? form.genres : form[field].trim()) === JSON.stringify(field === 'genres' ? was : was.trim())
                return same ? (base?.[field] ?? null) : (empty ? null : value)
            }
            const details = {
                name: festival ? pick('name', form.name.trim(), !form.name.trim()) : null,
                country: pick('country', form.country.trim(), !form.country.trim()),
                since: pick('since', Number(form.since.trim()), !form.since.trim()),
                description: festival ? pick('description', form.description.trim(), !form.description.trim()) : null,
                genres: pick('genres', form.genres, form.genres.length === 0),
            }
            const saved = await saveStationDetails(kind, stationKey, details)
            applyStationDetails(kind, stationKey, saved)
            setState(s => ({ ...s, loaded: s.form, base: saved }))
            setMessage('Saved: the map shows it now.')
        } catch (err) {
            setError(errorOf(err, 'Could not save. Try again.'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="panel mb-4 grid gap-3" onSubmit={save}>
            <div>
                <h2 className="panel__label m-0">On the map</h2>
                <p className="muted text-sm mt-1 mb-0">
                    {canEdit
                        ? `What the galaxy and the ${festival ? 'festival' : 'label'} list say about it. Changes show right away and can be undone from the admin history.`
                        : 'Only editors, admins and a trusted owner can change these. Write to us (Feedback) if something is wrong, or ask an admin to trust your page.'}
                </p>
            </div>
            {festival && (
                <div>
                    <label htmlFor="station-name" className="field-label">Name</label>
                    <input id="station-name" className="field" value={form.name} onChange={set('name')} disabled={!canEdit} maxLength={80} />
                    <p className="muted text-xs mt-1 mb-0">The former name keeps pointing here, so older line-ups and artist pages still find it.</p>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                    <label htmlFor="station-country" className="field-label">Country</label>
                    <input id="station-country" className="field" value={form.country} onChange={set('country')} disabled={!canEdit} maxLength={100} />
                </div>
                <div>
                    <label htmlFor="station-since" className="field-label">Since <span className="muted">(year)</span></label>
                    <input id="station-since" className="field" inputMode="numeric" value={form.since} onChange={set('since')} disabled={!canEdit} />
                </div>
            </div>
            {festival && (
                <div>
                    <label htmlFor="station-description" className="field-label">On the map · {form.description.length}/1000</label>
                    <textarea id="station-description" className="field" rows={3} maxLength={1000} value={form.description}
                        onChange={set('description')} disabled={!canEdit} />
                </div>
            )}
            <div>
                <span className="field-label">Genres it plays <span className="muted">(up to 6; where it sits in the galaxy)</span></span>
                <div className="flex flex-wrap items-center gap-2">
                    {form.genres.map(g => (
                        <GenreChip key={g} id={g} onRemove={canEdit ? () => setGenres(form.genres.filter(x => x !== g)) : undefined} />
                    ))}
                    {canEdit && form.genres.length < 6 && (
                        <AddGenre exclude={form.genres} onAdd={(g) => setGenres([...form.genres, g])} />
                    )}
                </div>
            </div>
            {error && <p className="notice m-0">{error}</p>}
            {message && <p className="mono text-xs m-0" style={{ color: 'var(--accent)' }}>✓ {message}</p>}
            {canEdit && (
                <button type="submit" className="btn btn--primary justify-self-start" disabled={saving}>
                    {saving ? 'Saving…' : 'Save map details'}
                </button>
            )}
        </form>
    )
}

export default StationDetailsEditor
