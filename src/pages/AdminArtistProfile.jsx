import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchAdminArtistProfile, fetchArtist, saveArtistProfile } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import usePageMeta from '../hooks/usePageMeta.js'

const FIELDS = [
    { key: 'photoUrl', label: 'Photo', placeholder: 'https://… (a square picture works best)' },
    { key: 'soundcloudUrl', label: 'SoundCloud', placeholder: 'https://soundcloud.com/…' },
    { key: 'bandcampUrl', label: 'Bandcamp', placeholder: 'https://….bandcamp.com' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'websiteUrl', label: 'Website', placeholder: 'https://…' },
]
const EMPTY = { photoUrl: '', bio: '', soundcloudUrl: '', bandcampUrl: '', instagramUrl: '', websiteUrl: '', bookingEmail: '' }
const MAX_BIO = 1000

// Admin panel: an artist's profile (photo, bio, links, booking) as their page shows it.
// Opened from "Artist genres" as /admin/artists/<slug>/profile; only artists from the line-ups have a page.
function AdminArtistProfile() {
    const { slug } = useParams()
    const location = useLocation()
    // The name as the link showed it; opened directly, it comes with the artist's page
    const [loadedName, setLoadedName] = useState(null)
    const name = location.state?.name || loadedName || slug
    usePageMeta({ title: `Profile · ${name}`, path: `/admin/artists/${slug}/profile`, noindex: true })

    const [form, setForm] = useState(null)
    const [state, setState] = useState({ saving: false, saved: false, error: '', fieldErrors: {} })

    useEffect(() => {
        const controller = new AbortController()
        if (!location.state?.name) {
            fetchArtist(slug, controller.signal).then(artist => setLoadedName(artist.name)).catch(() => {})
        }
        fetchAdminArtistProfile(slug, controller.signal)
            .then(profile => setForm(Object.fromEntries(Object.keys(EMPTY).map(key => [key, profile[key] ?? '']))))
            .catch(err => {
                if (!controller.signal.aborted) {
                    setForm(EMPTY)
                    setState(s => ({ ...s, error: err.response?.data?.message || 'Could not load the profile.' }))
                }
            })
        return () => controller.abort()
    }, [slug, location.state?.name])

    const change = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setState(s => ({ ...s, saved: false }))
    }

    const save = async (e) => {
        e.preventDefault()
        setState({ saving: true, saved: false, error: '', fieldErrors: {} })
        try {
            await saveArtistProfile(slug, Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])))
            setState({ saving: false, saved: true, error: '', fieldErrors: {} })
        } catch (err) {
            const data = err.response?.data
            setState({
                saving: false,
                saved: false,
                error: err.response?.status === 404
                    ? 'This artist is not in any line-up yet, so there is no page to show a profile on.'
                    : data?.errors ? 'Some fields need a fix.' : data?.message || 'Could not save. Try again.',
                fieldErrors: data?.errors || {},
            })
        }
    }

    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Admin · star charts</div>
                <h1 className="page-title">{name}</h1>
                <p className="page-head__sub">
                    The profile on the artist's page. Links must start with https://. Every save is in the history.
                </p>
            </header>
            <AdminTabs />

            {!form ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : (
                <form className="panel grid gap-4" onSubmit={save}>
                    {form.photoUrl.startsWith('https://') && (
                        <img className="artist-head__photo" src={form.photoUrl} alt="" referrerPolicy="no-referrer" />
                    )}
                    {FIELDS.map(field => (
                        <div key={field.key}>
                            <label htmlFor={`profile-${field.key}`} className="field-label">{field.label}</label>
                            <input id={`profile-${field.key}`} type="url" className="field" value={form[field.key]}
                                placeholder={field.placeholder} onChange={(e) => change(field.key, e.target.value)} />
                            {state.fieldErrors[field.key] && <p className="notice mt-1 mb-0">{state.fieldErrors[field.key]}</p>}
                        </div>
                    ))}
                    <div>
                        <label htmlFor="profile-bookingEmail" className="field-label">Booking email</label>
                        <input id="profile-bookingEmail" type="email" className="field" value={form.bookingEmail}
                            placeholder="booking@…" onChange={(e) => change('bookingEmail', e.target.value)} />
                        {state.fieldErrors.bookingEmail && <p className="notice mt-1 mb-0">{state.fieldErrors.bookingEmail}</p>}
                    </div>
                    <div>
                        <label htmlFor="profile-bio" className="field-label">Bio · {form.bio.length}/{MAX_BIO}</label>
                        <textarea id="profile-bio" className="field" rows={5} maxLength={MAX_BIO} value={form.bio}
                            placeholder="A few sentences: where they're from, their sound, labels…"
                            onChange={(e) => change('bio', e.target.value)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" className="btn btn--primary" disabled={state.saving}>
                            {state.saving ? 'Saving…' : 'Save profile'}
                        </button>
                        <Link className="link mono text-xs" to={`/artists/${encodeURIComponent(slug)}`} state={{ name }}>
                            Artist page →
                        </Link>
                        {state.saved && <span className="mono text-xs soft" role="status">Saved.</span>}
                    </div>
                    {state.error && <p className="notice m-0">{state.error}</p>}
                </form>
            )}
        </div>
    )
}

export default AdminArtistProfile
