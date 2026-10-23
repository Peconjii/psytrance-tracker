import { useEffect, useState } from 'react'
import { fetchPageTrust, setPageTrust } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import { TRUST_POWERS } from './pageTrust.js'

// On a page's editor: an admin trusts the owner (their changes go live without an admin) or stops; the owner sees
// which of their changes wait for an admin. kind: ARTIST | ORGANIZER | LABEL | FESTIVAL; id: the page's key.
function TrustPanel({ kind, id }) {
    const { user } = useAuth()
    const [trust, setTrust] = useState(null)
    const [state, setState] = useState({ saving: false, error: '' })

    useEffect(() => {
        const controller = new AbortController()
        fetchPageTrust(kind, id, controller.signal).then(setTrust).catch(() => {})
        return () => controller.abort()
    }, [kind, id])

    if (!trust?.owner) return null
    const power = TRUST_POWERS[kind]

    if (!user?.admin) {
        return (
            <p className="mono text-xs soft mb-4" role="status">
                {trust.trusted
                    ? `✔ Trusted page: ${power.trusted}.`
                    : `An admin checks ${power.waiting} first. Once an admin trusts your page, that goes live at once.`}
            </p>
        )
    }

    const toggle = async () => {
        setState({ saving: true, error: '' })
        try {
            setTrust(await setPageTrust(kind, id, !trust.trusted))
            setState({ saving: false, error: '' })
        } catch (err) {
            setState({ saving: false, error: err.response?.data?.message || 'Could not save. Try again.' })
        }
    }

    return (
        <section className="panel mb-4 grid gap-2">
            <h2 className="panel__label m-0">Trust · {trust.owner}</h2>
            <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={trust.trusted} disabled={state.saving} onChange={toggle} className="mt-1" />
                <span>Trust the owner: {power.admin}, with no admin in between. Only for this page.</span>
            </label>
            {state.error && <p className="notice m-0">{state.error}</p>}
        </section>
    )
}

// While approving a claim or a new page: trust the new owner right away
export function TrustCheckbox({ kind, id, checked, onChange }) {
    return (
        <label htmlFor={id} className="flex items-start gap-2 text-sm soft">
            <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
            <span>Trust them right away: {TRUST_POWERS[kind].admin}. You can change it later on the page’s editor.</span>
        </label>
    )
}

export default TrustPanel
