import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    fetchLabelEdit, removeLabelOwner, requestLabelCrew, saveLabelProfile, setLabelOwner,
} from '../api/backend.js'
import OwnerForm from '../components/OwnerForm.jsx'
import OwnerNumbers from '../components/OwnerNumbers.jsx'
import ImageField from '../components/ImageField.jsx'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'

const FIELDS = [
    { key: 'logoUrl', label: 'Logo', placeholder: 'https://…', image: 'square' },
    { key: 'websiteUrl', label: 'Website', placeholder: 'https://…' },
    { key: 'bandcampUrl', label: 'Bandcamp', placeholder: 'https://….bandcamp.com' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
]
const MAX_TEXT = 2000
const EMPTY = { description: '', logoUrl: '', websiteUrl: '', bandcampUrl: '', instagramUrl: '' }

// Editing a label's page: by its owner (an admin linked them) or an admin. The page changes right away; artists
// joining or leaving the crew go to an admin first, because following the label and its numbers use the crew.
function LabelEdit() {
    const { name } = useParams()
    const { user } = useAuth()
    const [edit, setEdit] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [profile, setProfile] = useState(EMPTY)
    const [newArtist, setNewArtist] = useState('')
    const [status, setStatus] = useState({ part: null, ok: '', error: '' })
    const [saving, setSaving] = useState(null)

    usePageMeta({ title: `Edit · ${name}`, path: `/labels/${encodeURIComponent(name)}/edit`, noindex: true })

    const show = (found) => {
        setEdit(found)
        setProfile(Object.fromEntries(Object.keys(EMPTY).map(k => [k, found.profile?.[k] ?? ''])))
    }
    const reload = () => fetchLabelEdit(name).then(show)

    useEffect(() => {
        const controller = new AbortController()
        fetchLabelEdit(name, controller.signal)
            .then(show)
            .catch(err => {
                if (controller.signal.aborted) return
                setLoadError(err.response?.status === 403 ? 'Only the label and admins can edit this page.'
                    : err.response?.data?.message || 'Could not load the page.')
            })
        return () => controller.abort()
    }, [name])

    const run = async (part, action, ok) => {
        setSaving(part)
        setStatus({ part, ok: '', error: '' })
        try {
            await action()
            setStatus({ part, ok, error: '' })
        } catch (err) {
            const data = err.response?.data
            setStatus({ part, ok: '', error: data?.errors ? 'Some fields need a fix: ' + Object.keys(data.errors).join(', ')
                : data?.message || 'Could not save. Try again.' })
        } finally {
            setSaving(null)
        }
    }
    const statusOf = (part) => status.part === part && (
        <>
            {status.ok && <span className="mono text-xs soft" role="status">{status.ok}</span>}
            {status.error && <p className="notice m-0">{status.error}</p>}
        </>
    )
    const crewChange = (kind, artistName) => run('crew', async () => {
        await requestLabelCrew(name, kind, artistName)
        await reload()
        setNewArtist('')
    }, user?.admin ? 'Done.' : 'Sent to an admin.')

    if (loadError) return <div className="page page--narrow"><p className="notice">{loadError}</p></div>
    if (!edit) return <div className="page page--narrow"><p className="mono text-xs muted">Loading…</p></div>

    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Constellation · edit page</div>
                <h1 className="page-title">{edit.name}</h1>
                <p className="page-head__sub">
                    What you write here shows on <Link className="link" to={`/labels/${encodeURIComponent(name)}`}>the label's page</Link> right
                    away. Artists joining or leaving the crew are checked by an admin first.
                </p>
            </header>

            <OwnerNumbers kind="label" id={name} />

            <form className="panel mb-4 grid gap-3" onSubmit={(e) => {
                e.preventDefault()
                run('profile', () => saveLabelProfile(name, Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim()]))), 'Saved.')
            }}>
                <h2 className="panel__label m-0">Page</h2>
                <div>
                    <label htmlFor="label-description" className="field-label">About · {profile.description.length}/{MAX_TEXT}</label>
                    <textarea id="label-description" className="field" rows={5} maxLength={MAX_TEXT} value={profile.description}
                        placeholder="Who you are, your sound, your story…" onChange={(e) => setProfile(p => ({ ...p, description: e.target.value }))} />
                </div>
                {FIELDS.map(field => field.image ? (
                    <ImageField key={field.key} id={`label-${field.key}`} label={field.label} kind={field.image} value={profile[field.key]}
                        placeholder={field.placeholder} onChange={(url) => setProfile(p => ({ ...p, [field.key]: url }))} />
                ) : (
                    <div key={field.key}>
                        <label htmlFor={`label-${field.key}`} className="field-label">{field.label}</label>
                        <input id={`label-${field.key}`} type="url" className="field" value={profile[field.key]} placeholder={field.placeholder}
                            onChange={(e) => setProfile(p => ({ ...p, [field.key]: e.target.value }))} />
                    </div>
                ))}
                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="btn btn--primary" disabled={saving === 'profile'}>{saving === 'profile' ? 'Saving…' : 'Save'}</button>
                    {statusOf('profile')}
                </div>
            </form>

            <section className="panel mb-4 grid gap-3">
                <h2 className="panel__label m-0">Crew · {edit.crew.length}</h2>
                <ul className="rows">
                    {edit.crew.map(artist => (
                        <li key={artist} className="rows__item">
                            <span className="rows__name">{artist}</span>
                            <button type="button" className="btn btn--ghost btn--danger" disabled={saving === 'crew'}
                                onClick={() => crewChange('REMOVE', artist)}>Take off</button>
                        </li>
                    ))}
                </ul>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newArtist.trim()) crewChange('ADD', newArtist.trim()) }}>
                    <input className="field" aria-label="Artist to add" placeholder="An artist from the line-ups, e.g. Ajja" maxLength={100}
                        value={newArtist} onChange={(e) => setNewArtist(e.target.value)} />
                    <button type="submit" className="btn shrink-0" disabled={saving === 'crew'}>+ Add</button>
                </form>
                {statusOf('crew')}
                {edit.pending.length > 0 && (
                    <div>
                        <h3 className="field-label">Waiting for an admin</h3>
                        <ul className="list-none p-0 m-0 mono text-xs soft grid gap-1">
                            {edit.pending.map(r => <li key={r.id}>{r.kind === 'ADD' ? '+ add' : '– take off'} {r.artistName}</li>)}
                        </ul>
                    </div>
                )}
            </section>

            {user?.admin && (
                <OwnerForm key={edit.owner ?? ''} owner={edit.owner} what="label"
                    save={(username) => setLabelOwner(name, username)} remove={() => removeLabelOwner(name)} onSaved={reload} />
            )}
        </div>
    )
}

export default LabelEdit
