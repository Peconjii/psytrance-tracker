import { useEffect, useState } from 'react'
import { fetchBuddySettings, saveBuddySettings } from '../api/backend.js'
import { COUNTRIES } from './countries.js'

// Festival Buddies settings: the opt-in switch plus optional country, note and Instagram.
// Used on the profile and, folded in, on an event page when the user is going but not visible yet.
function BuddySettingsForm({ onSaved, compact = false }) {
    const [settings, setSettings] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        let alive = true
        fetchBuddySettings()
            .then((s) => alive && setSettings({ visible: s.visible, country: s.country ?? '', note: s.note ?? '', instagram: s.instagram ?? '' }))
            .catch(() => alive && setError('Could not load your settings.'))
        return () => { alive = false }
    }, [])

    if (!settings) return error ? <p className="text-sm text-[var(--danger)] m-0">{error}</p> : null

    const change = (key) => (e) => {
        setSaved(false)
        setSettings((s) => ({ ...s, [key]: e.target.value }))
    }

    const save = async (next) => {
        setSaving(true)
        setError('')
        try {
            const body = {
                visible: next.visible,
                country: next.country || null,
                note: next.note.trim() || null,
                instagram: next.instagram.replace(/^@/, '').trim() || null,
            }
            const s = await saveBuddySettings(body)
            setSettings({ visible: s.visible, country: s.country ?? '', note: s.note ?? '', instagram: s.instagram ?? '' })
            setSaved(true)
            onSaved?.(s)
        } catch (err) {
            setError(err?.response?.status === 400 ? 'Check the Instagram name (letters, numbers, dots, underscores).' : 'Could not save, try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(settings) }}>
            <div className="flex items-center justify-between gap-4">
                <p className="muted text-sm m-0 max-w-md">
                    {compact
                        ? 'Show yourself to others going to the same events. Only people who are also going and visible can see you.'
                        : 'Off by default. When on, people going to the same event who also turned this on can see your name, country, note and Instagram. Your email is never shown.'}
                </p>
                <button type="button" role="switch" aria-checked={settings.visible} aria-label="Festival Buddies"
                    disabled={saving} className="switch shrink-0"
                    onClick={() => save({ ...settings, visible: !settings.visible })} />
            </div>
            {settings.visible && (
                <div className="grid sm:grid-cols-3 gap-3">
                    <label className="m-0">
                        <span className="field-label">Country</span>
                        <select className="field" value={settings.country} onChange={change('country')}>
                            <option value="">Don't show</option>
                            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="m-0">
                        <span className="field-label">Instagram (optional)</span>
                        <input className="field" placeholder="yourname" maxLength={31} value={settings.instagram} onChange={change('instagram')} />
                    </label>
                    <label className="m-0">
                        <span className="field-label">Note (optional)</span>
                        <input className="field" placeholder="Looking for a ride from…" maxLength={140} value={settings.note} onChange={change('note')} />
                    </label>
                    <div className="sm:col-span-3 flex items-center gap-3">
                        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                        {saved && <span className="muted text-sm">Saved</span>}
                    </div>
                </div>
            )}
            {error && <p className="text-sm text-[var(--danger)] m-0">{error}</p>}
        </form>
    )
}

export default BuddySettingsForm
