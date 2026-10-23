import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    removeArtistOwner, removeFestivalOwner, removeLabelOwner, removeOrganizerOwner, searchSite, setArtistOwner,
    setFestivalOwner, setLabelOwner, setOrganizerOwner, setPageTrust,
} from '../api/backend.js'
import { TRUST_POWERS } from './pageTrust.js'

// Per kind of page: its label, its path on the site, and how an admin links or unlinks its owner
const KINDS = {
    ARTIST: { label: 'Artist', which: 'Which artist (DJ, producer, live act)?', path: (key) => `/artists/${key}`, link: setArtistOwner, unlink: removeArtistOwner },
    ORGANIZER: { label: 'Organizer', which: 'Which organizer?', path: (key) => `/organizers/${key}`, link: setOrganizerOwner, unlink: removeOrganizerOwner },
    LABEL: { label: 'Label', which: 'Which label?', path: (key) => `/labels/${encodeURIComponent(key)}`, link: setLabelOwner, unlink: removeLabelOwner },
    FESTIVAL: { label: 'Festival', which: 'Which festival?', path: (key) => `/festivals/${key}`, link: setFestivalOwner, unlink: removeFestivalOwner },
}

// The site search's answer as pages to pick: { kind, key, name }
const pagesFound = (found) => [
    ...found.artists.map(a => ({ kind: 'ARTIST', key: a.slug, name: a.name })),
    ...found.organizers.map(o => ({ kind: 'ORGANIZER', key: o.slug, name: o.name })),
    ...found.labels.map(name => ({ kind: 'LABEL', key: name, name })),
    ...found.festivals.map(f => ({ kind: 'FESTIVAL', key: f.id, name: f.name })),
]

// Admin → Users, under an account: the pages it owns, whether it is trusted on each (see PageTrust), and linking it
// to another page. onChanged: load the users again. linking: the kind of page being linked (ARTIST, ORGANIZER, LABEL,
// FESTIVAL, or ANY), or null; onLinking changes it.
function UserPages({ user, onChanged, linking, onLinking }) {
    const [search, setSearch] = useState('')
    const [found, setFound] = useState([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const q = search.trim()
        if (q.length < 2) return
        const controller = new AbortController()
        const timer = setTimeout(() => {
            searchSite(q, controller.signal).then(result => setFound(pagesFound(result))).catch(() => {})
        }, 300)
        return () => { clearTimeout(timer); controller.abort() }
    }, [search])

    const run = async (action) => {
        setBusy(true)
        setError('')
        try {
            await action()
            onChanged()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setBusy(false)
        }
    }
    const link = (page) => run(async () => {
        await KINDS[page.kind].link(page.key, user.username)
        stopLinking()
    })
    const stopLinking = () => {
        onLinking(null)
        setSearch('')
        setFound([])
    }
    const shown = found.filter(page => linking === 'ANY' || page.kind === linking)
    const unlink = (page) => {
        if (window.confirm(`Take ${page.name} away from ${user.username}?`)) run(() => KINDS[page.kind].unlink(page.key))
    }

    return (
        <div className="user-pages">
            {user.pages.map(page => (
                <div key={page.kind + page.key} className="user-pages__row">
                    <span className="badge">{KINDS[page.kind].label}</span>
                    <Link className="link" to={KINDS[page.kind].path(page.key)}>{page.name}</Link>
                    <label className="flex items-center gap-1 mono text-xs soft" title={`Trusted: ${TRUST_POWERS[page.kind].admin}`}>
                        <input type="checkbox" checked={page.trusted} disabled={busy}
                            onChange={(e) => run(() => setPageTrust(page.kind, page.key, e.target.checked))} />
                        trusted
                    </label>
                    <button type="button" className="btn btn--ghost btn--danger" disabled={busy} onClick={() => unlink(page)}
                        aria-label={`Unlink ${page.name}`}>✕</button>
                </div>
            ))}
            {linking ? (
                <div className="grid gap-2">
                    <label htmlFor={`link-${user.id}`} className="field-label m-0">
                        {linking === 'ANY' ? 'Which page?' : KINDS[linking].which} It becomes {user.username}’s.
                    </label>
                    <input id={`link-${user.id}`} className="field" autoFocus value={search}
                        placeholder="Type its name…" onChange={(e) => setSearch(e.target.value)} />
                    {search.trim().length >= 2 && (shown.length > 0 ? (
                        <ul className="list-none p-0 m-0 grid gap-1">
                            {shown.slice(0, 8).map(page => (
                                <li key={page.kind + page.key}>
                                    <button type="button" className="user-pages__pick" disabled={busy} onClick={() => link(page)}>
                                        <span className="badge">{KINDS[page.kind].label}</span> {page.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mono text-xs muted m-0">Nothing found yet.</p>
                    ))}
                    <p className="mono text-xs muted m-0">
                        Picking one makes {user.username} its owner (a previous owner loses it). Not on the site? They ask with “Get your page”.
                    </p>
                    <button type="button" className="btn btn--ghost w-fit" onClick={stopLinking}>Cancel</button>
                </div>
            ) : (
                <button type="button" className="btn btn--ghost w-fit" onClick={() => onLinking('ANY')}>+ Link a page</button>
            )}
            {error && <p className="notice m-0">{error}</p>}
        </div>
    )
}

export default UserPages
