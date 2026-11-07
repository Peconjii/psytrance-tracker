import { useEffect, useState } from 'react'
import { fetchSetsAt, saveSetsAt } from '../api/backend.js'
import { reloadDiscographyLater } from '../map/data/discography'
import { errorOf } from './formErrors.js'

const MAX_SETS = 200

// A festival's owner (or an admin) writes the sets played at the festival: who, which year, a link to the recording.
// They land in each artist's "Festivals played" and on the festival's page.
export default function FestivalSetsEditor({ id }) {
    const [sets, setSets] = useState(null)
    const [status, setStatus] = useState({ ok: '', error: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetchSetsAt(id, controller.signal)
            .then(found => setSets(found.map(s => ({ artist: s.artist, year: s.year ?? '', url: s.url ?? '' }))))
            .catch(err => !controller.signal.aborted && setStatus({ ok: '', error: errorOf(err) }))
        return () => controller.abort()
    }, [id])

    const change = (i, key, value) => setSets(prev => prev.map((s, j) => (j === i ? { ...s, [key]: value } : s)))

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        setStatus({ ok: '', error: '' })
        try {
            const saved = await saveSetsAt(id, sets.filter(s => s.artist.trim()).map(s => ({
                artist: s.artist.trim(), year: s.year === '' ? null : Number(s.year), url: s.url.trim() || null,
            })))
            setSets(saved.map(s => ({ artist: s.artist, year: s.year ?? '', url: s.url ?? '' })))
            reloadDiscographyLater()
            setStatus({ ok: 'Saved. The sets are on your page and on each artist’s page.', error: '' })
        } catch (err) {
            setStatus({ ok: '', error: errorOf(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="panel mb-4 grid gap-3" onSubmit={save}>
            <div>
                <h2 className="panel__label m-0">Sets played here{sets ? ` · ${sets.length}` : ''}</h2>
                <p className="muted text-sm mt-1 mb-0">
                    Who played, which year, and a link to the recording (YouTube, SoundCloud) or the line-up. Each set also
                    shows under “Festivals played” on the artist’s page.
                </p>
            </div>
            {!sets ? <p className="mono text-xs muted m-0">Loading…</p> : sets.map((s, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                    <input className="field w-auto flex-1" placeholder="Artist" aria-label="Artist" value={s.artist}
                        onChange={(e) => change(i, 'artist', e.target.value)} />
                    <input className="field w-24" type="number" min="1960" max="2100" placeholder="Year" aria-label="Year" value={s.year}
                        onChange={(e) => change(i, 'year', e.target.value)} />
                    <input className="field w-auto flex-1" type="url" placeholder="https://… (optional)" aria-label="Link" value={s.url}
                        onChange={(e) => change(i, 'url', e.target.value)} />
                    <button type="button" className="btn btn--ghost" aria-label={`Remove ${s.artist || 'this set'}`}
                        onClick={() => setSets(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
            ))}
            {sets && sets.length < MAX_SETS && (
                <button type="button" className="btn w-fit" onClick={() => setSets(prev => [...prev, { artist: '', year: '', url: '' }])}>+ Add set</button>
            )}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn--primary" disabled={saving || !sets} aria-busy={saving}>{saving ? 'Saving…' : 'Save'}</button>
                {status.ok && <span className="mono text-xs soft" role="status">{status.ok}</span>}
            </div>
            {status.error && <p className="notice m-0">{status.error}</p>}
        </form>
    )
}
