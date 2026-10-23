import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    fetchFestivalEdit, fetchOrganizers, removeFestivalOwner, saveFestivalProfile, setFestivalOwner,
} from '../api/backend.js'
import OwnerForm from '../components/OwnerForm.jsx'
import OwnerNumbers from '../components/OwnerNumbers.jsx'
import LinkFields from '../components/LinkFields.jsx'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'
import { errorOf } from '../components/formErrors.js'

const FIELDS = [
    { key: 'logoUrl', label: 'Logo', placeholder: 'https://…', image: 'square' },
    { key: 'websiteUrl', label: 'Website', placeholder: 'https://…' },
    { key: 'ticketUrl', label: 'Tickets', placeholder: 'https://…' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
]
const MAX_TEXT = 2000
const EMPTY = { description: '', logoUrl: '', websiteUrl: '', ticketUrl: '', instagramUrl: '', organizerSlug: '' }

// Editing a festival's page: by its owner (an admin linked them) or an admin. Their own words and links, and the
// organizer who runs the festival, so the festival's page leads to the organizer's page and its events.
function FestivalEdit() {
    const { id } = useParams()
    const { user } = useAuth()
    const [edit, setEdit] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [profile, setProfile] = useState(EMPTY)
    const [organizerSearch, setOrganizerSearch] = useState('')
    const [organizerHits, setOrganizerHits] = useState([])
    const [status, setStatus] = useState({ ok: '', error: '' })
    const [saving, setSaving] = useState(false)

    usePageMeta({ title: `Edit · ${edit?.name || id}`, path: `/festivals/${id}/edit`, noindex: true })

    const show = (found) => {
        setEdit(found)
        setProfile(Object.fromEntries(Object.keys(EMPTY).map(k => [k, found.profile?.[k] ?? ''])))
    }
    const reload = () => fetchFestivalEdit(id).then(show)

    useEffect(() => {
        const controller = new AbortController()
        fetchFestivalEdit(id, controller.signal)
            .then(show)
            .catch(err => {
                if (controller.signal.aborted) return
                setLoadError(err.response?.status === 403 ? 'Only the festival and admins can edit this page.'
                    : err.response?.data?.message || 'Could not load the page.')
            })
        return () => controller.abort()
    }, [id])

    // Organizers whose name has what was typed, to pick the one that runs the festival
    useEffect(() => {
        if (organizerSearch.trim().length < 2) return
        const controller = new AbortController()
        const timer = setTimeout(() => {
            fetchOrganizers(organizerSearch.trim(), controller.signal).then(found => setOrganizerHits(found.slice(0, 6))).catch(() => {})
        }, 300)
        return () => { clearTimeout(timer); controller.abort() }
    }, [organizerSearch])

    const save = async (e) => {
        e.preventDefault()
        setSaving(true)
        setStatus({ ok: '', error: '' })
        try {
            await saveFestivalProfile(id, Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim()])))
            await reload()
            setStatus({ ok: 'Saved.', error: '' })
        } catch (err) {
            setStatus({ ok: '', error: errorOf(err) })
        } finally {
            setSaving(false)
        }
    }

    if (loadError) return <div className="page page--narrow"><p className="notice">{loadError}</p></div>
    if (!edit) return <div className="page page--narrow"><p className="mono text-xs muted">Loading…</p></div>

    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Station · edit page</div>
                <h1 className="page-title">{edit.name}</h1>
                <p className="page-head__sub">
                    What you write here shows on <Link className="link" to={`/festivals/${id}`}>the festival's page</Link> right away.
                </p>
            </header>

            <OwnerNumbers kind="festival" id={id} />

            <form className="panel mb-4 grid gap-3" onSubmit={save}>
                <h2 className="panel__label m-0">Page</h2>
                <div>
                    <label htmlFor="festival-description" className="field-label">In your words · {profile.description.length}/{MAX_TEXT}</label>
                    <textarea id="festival-description" className="field" rows={5} maxLength={MAX_TEXT} value={profile.description}
                        placeholder="What the festival is about, this year's edition…"
                        onChange={(e) => setProfile(p => ({ ...p, description: e.target.value }))} />
                </div>
                <LinkFields fields={FIELDS} idPrefix="festival" values={profile}
                    onChange={(key, value) => setProfile(p => ({ ...p, [key]: value }))} />
                <div>
                    <label htmlFor="festival-organizer" className="field-label">Organizer who runs it</label>
                    <p className="mono text-xs muted m-0 mb-2">
                        Now: {profile.organizerSlug ? (edit.organizer && edit.organizer.slug === profile.organizerSlug ? edit.organizer.name : profile.organizerSlug) : 'nobody'}
                        {profile.organizerSlug && (
                            <> · <button type="button" className="link bg-transparent border-0 p-0 cursor-pointer"
                                onClick={() => setProfile(p => ({ ...p, organizerSlug: '' }))}>remove</button></>
                        )}
                    </p>
                    <input id="festival-organizer" className="field" placeholder="Find the organizer…" value={organizerSearch}
                        onChange={(e) => setOrganizerSearch(e.target.value)} />
                    {organizerSearch.trim().length >= 2 && organizerHits.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {organizerHits.map(o => (
                                <button key={o.slug} type="button" className={`chip${profile.organizerSlug === o.slug ? ' is-on' : ''}`}
                                    onClick={() => { setProfile(p => ({ ...p, organizerSlug: o.slug })); setOrganizerSearch('') }}>{o.name}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    {status.ok && <span className="mono text-xs soft" role="status">{status.ok}</span>}
                    {status.error && <p className="notice m-0">{status.error}</p>}
                </div>
            </form>

            {user?.admin && (
                <OwnerForm key={edit.owner ?? ''} owner={edit.owner} what="festival"
                    save={(username) => setFestivalOwner(id, username)} remove={() => removeFestivalOwner(id)} onSaved={reload} />
            )}
        </div>
    )
}

export default FestivalEdit
