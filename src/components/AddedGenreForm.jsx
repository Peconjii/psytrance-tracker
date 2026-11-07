import { useState } from 'react'
import { addMapGenre, removeMapGenre, updateMapGenre } from '../api/backend.js'
import { data } from '../map/data/types'
import { applyAddedGenre, forgetAddedGenre } from '../map/data/addedGenres'
import { reloadContentLater } from '../map/data/content'
import { reloadPlacementsLater } from '../map/data/placements'
import { AddGenre, GenreChip } from './AdminParts'

const MAX_LINKS = 4
const number = (v) => (v === '' || v == null ? null : Number(v))

// Admin -> Galaxy: a new genre (star) for the galaxy, or the map details of one added before (name, scene, year,
// tempo, the genres it is linked to, stage words, spot). `genre` is the added genre being changed; none for a new one.
// Its texts and key tracks are edited below in the same page, like any genre's.
export default function AddedGenreForm({ genre, onSaved, onRemoved, onCancel }) {
    const isNew = !genre
    const [form, setForm] = useState(() => ({
        name: genre?.name ?? '',
        family: genre?.family ?? 'dark',
        year: genre?.year ?? '',
        bpmMin: genre?.bpmMin ?? '',
        bpmMax: genre?.bpmMax ?? '',
        links: genre?.links ?? [],
        keywords: genre?.keywords?.join(', ') ?? '',
        x: genre?.x ?? '',
        y: genre?.y ?? '',
        description: '',
    }))
    const [state, setState] = useState({ saving: false, error: '' })
    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

    async function save(e) {
        e.preventDefault()
        setState({ saving: true, error: '' })
        const body = {
            name: form.name, family: form.family, year: number(form.year), bpmMin: number(form.bpmMin), bpmMax: number(form.bpmMax),
            links: form.links, keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
            x: number(form.x), y: number(form.y), description: form.description,
        }
        try {
            const saved = isNew ? await addMapGenre(body) : await updateMapGenre(genre.id, body)
            applyAddedGenre(saved)
            // The galaxy loads its texts and orbit again on the next visit
            reloadContentLater()
            reloadPlacementsLater()
            setState({ saving: false, error: '' })
            onSaved(saved)
        } catch (err) {
            setState({ saving: false, error: err.response?.data?.message || 'Could not save. Try again.' })
        }
    }

    async function remove() {
        if (!window.confirm(`Take ${genre.name} off the galaxy? Its texts and key tracks go with it, and artists placed in it leave it.`)) return
        setState({ saving: true, error: '' })
        try {
            await removeMapGenre(genre.id)
            forgetAddedGenre(genre.id)
            reloadContentLater()
            reloadPlacementsLater()
            onRemoved()
        } catch (err) {
            setState({ saving: false, error: err.response?.data?.message || 'Could not remove it. Try again.' })
        }
    }

    return (
        <form onSubmit={save} className="panel grid gap-4 mb-6">
            <h2 className="panel__label">{isNew ? 'New genre on the galaxy' : `Map details of ${genre.name} · added from the panel`}</h2>
            {isNew && (
                <p className="mono text-xs muted m-0">
                    A new star, drawn next to the genres it is linked to. Add it when the scene really uses the name; its key
                    tracks and artists come next, here and in Artist genres.
                </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="field-label" htmlFor="new-genre-name">Name</label>
                    <input id="new-genre-name" className="field" maxLength={40} required value={form.name} onChange={set('name')}
                        placeholder="Hypnotic psy" />
                </div>
                <div>
                    <label className="field-label" htmlFor="new-genre-family">Scene (its color)</label>
                    <select id="new-genre-family" className="field" value={form.family} onChange={set('family')}>
                        {Object.entries(data.families).map(([id, f]) => <option key={id} value={id}>{f.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="field-label" htmlFor="new-genre-year">Since (year)</label>
                    <input id="new-genre-year" className="field" inputMode="numeric" required value={form.year} onChange={set('year')} />
                </div>
                <div>
                    <label className="field-label" htmlFor="new-genre-bpm-min">BPM from</label>
                    <input id="new-genre-bpm-min" className="field" inputMode="numeric" value={form.bpmMin} onChange={set('bpmMin')} />
                </div>
                <div>
                    <label className="field-label" htmlFor="new-genre-bpm-max">BPM to</label>
                    <input id="new-genre-bpm-max" className="field" inputMode="numeric" value={form.bpmMax} onChange={set('bpmMax')} />
                </div>
            </div>
            <div>
                <span className="field-label">Linked to (lines on the galaxy) · the first is the one it grew out of</span>
                <div className="flex flex-wrap items-center gap-2">
                    {form.links.map((id, i) => (
                        <GenreChip key={id} id={id} disabled={state.saving}
                            onRemove={() => setForm(f => ({ ...f, links: f.links.filter(l => l !== id) }))}>
                            {i === 0 && <span className="mono text-xs">grew out of</span>}
                        </GenreChip>
                    ))}
                    {form.links.length < MAX_LINKS && (
                        <AddGenre exclude={[...form.links, ...(genre ? [genre.id] : [])]} disabled={state.saving} label="Link it to a genre"
                            onAdd={(id) => setForm(f => ({ ...f, links: [...f.links, id] }))} />
                    )}
                </div>
            </div>
            <div>
                <label className="field-label" htmlFor="new-genre-keywords">More words that name it on stage headers (comma separated, optional)</label>
                <input id="new-genre-keywords" className="field" value={form.keywords} onChange={set('keywords')} placeholder="hypno, hypnotic" />
            </div>
            {isNew ? (
                <div>
                    <label className="field-label" htmlFor="new-genre-description">Description</label>
                    <textarea id="new-genre-description" className="field" rows={3} required value={form.description}
                        onChange={set('description')} placeholder="What it sounds like and where it comes from" />
                </div>
            ) : (
                <div>
                    <span className="field-label">Spot on the galaxy (x, y)</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <input className="field" style={{ width: '7rem' }} inputMode="numeric" aria-label="x" value={form.x} onChange={set('x')} />
                        <input className="field" style={{ width: '7rem' }} inputMode="numeric" aria-label="y" value={form.y} onChange={set('y')} />
                        <span className="mono text-xs muted">Bigger x is further right, bigger y further down. Galaxy: 0–3250 × 0–2535.</span>
                    </div>
                </div>
            )}
            {state.error && <p className="notice m-0">{state.error}</p>}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn--primary" disabled={state.saving || form.links.length === 0} aria-busy={state.saving}>
                    {state.saving ? 'Saving…' : isNew ? 'Add to the galaxy' : 'Save map details'}
                </button>
                {form.links.length === 0 && <span className="mono text-xs muted">Link it to at least one genre: it decides where it sits.</span>}
                {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={state.saving}>Cancel</button>}
                {!isNew && (
                    <button type="button" className="btn btn--ghost btn--danger ml-auto" onClick={remove} disabled={state.saving}>
                        Take off the galaxy
                    </button>
                )}
            </div>
        </form>
    )
}
