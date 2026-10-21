import { useState } from 'react'
import { Link } from 'react-router-dom'
import { setFeedbackStatus } from '../api/backend.js'
import { data, genreById } from '../map/data/types'

// Pieces the admin pages share: the map genres as chips and in a picker, and the banner for a feedback message
// that is being fixed.

// Genres grouped by scene, as in the picker
const SCENES = Object.entries(data.families).map(([id, family]) => ({
    name: family.name,
    genres: data.genres.filter(g => g.family === id),
}))

/** The <option>s of a genre picker, grouped by scene, without the genres in `exclude` */
export function GenreOptions({ exclude = [] }) {
    return SCENES.map(scene => (
        <optgroup key={scene.name} label={scene.name}>
            {scene.genres.filter(g => !exclude.includes(g.id)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </optgroup>
    ))
}

/** "+ Add genre": picks one of the genres not in `exclude` */
export function AddGenre({ exclude, onAdd, disabled, label = 'Add a genre' }) {
    return (
        <select className="field admin-artist__add" value="" disabled={disabled} aria-label={label}
            onChange={(e) => e.target.value && onAdd(e.target.value)}>
            <option value="">+ Add genre</option>
            <GenreOptions exclude={exclude} />
        </select>
    )
}

/** A genre in its scene's color, with ✕ when it can be removed */
export function GenreChip({ id, children, title, onRemove, disabled }) {
    const genre = genreById[id]
    const color = genre ? data.families[genre.family].color : 'var(--muted)'
    return (
        <span className="genre-chip inline-flex items-center gap-2" style={{ '--c': color }} title={title}>
            {genre?.name ?? id}{children}
            {onRemove && (
                <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${genre?.name ?? id}`}
                    className="bg-transparent border-0 p-0 cursor-pointer" style={{ color }}>✕</button>
            )}
        </span>
    )
}

/**
 * Shown when an admin page was opened from a feedback message (?feedback=7): once something is saved
 * (`fixed`), it offers to mark the message as done.
 */
export function FeedbackBanner({ feedbackId, fixed }) {
    const [state, setState] = useState('open')

    const markDone = async () => {
        setState('saving')
        try {
            await setFeedbackStatus(feedbackId, 'DONE')
            setState('done')
        } catch {
            setState('error')
        }
    }

    return (
        <div className="panel mb-6" style={{ '--fam': 'var(--gold)' }}>
            {state === 'done' ? (
                <p className="m-0">Feedback #{feedbackId} is marked as done. <Link className="link" to="/admin/feedback">Back to the inbox →</Link></p>
            ) : (
                <div className="flex flex-wrap items-center gap-3">
                    <span>{fixed ? `Saved. Is feedback #${feedbackId} sorted now?` : `Fixing feedback #${feedbackId}.`}</span>
                    {fixed && (
                        <button className="btn btn--primary" onClick={markDone} disabled={state === 'saving'}>
                            {state === 'saving' ? 'Saving…' : 'Mark as done'}
                        </button>
                    )}
                    {state === 'error' && <span className="notice m-0">Could not change the status. Try again.</span>}
                </div>
            )}
        </div>
    )
}
