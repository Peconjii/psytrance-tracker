import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addMapFestival, addMapLabel, fetchMapExtras, removeMapFestival, removeMapLabel } from '../api/backend.js'
import { forgetMapExtra, reloadMapExtrasLater } from '../map/data/extras'
import MapPlaceFields from './MapPlaceFields.jsx'
import { emptyMapPlace, mapPlaceOf } from './mapPlace.js'

// For admins: put a label or festival on the map without a change to the map files or a deploy. Its marker sits
// next to the stars of its genres; its owner can then claim the page (or an admin links one).
function AddToMap() {
    const [kind, setKind] = useState('LABEL')
    const [name, setName] = useState('')
    const [place, setPlace] = useState(emptyMapPlace)
    const [state, setState] = useState({ saving: false, error: '', added: null })
    // What admins added so far, to take off the map again; bumped to load it again
    const [extras, setExtras] = useState(null)
    const [version, setVersion] = useState(0)
    const [removing, setRemoving] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchMapExtras(controller.signal).then(setExtras).catch(() => {})
        return () => controller.abort()
    }, [version])

    const remove = async (what, key, label) => {
        if (!window.confirm(`Take ${label} off the map? Its owner, followers and page go too.`)) return
        setRemoving(key)
        try {
            if (what === 'LABEL') await removeMapLabel(key)
            else await removeMapFestival(key)
            forgetMapExtra(what, key)
            setVersion(v => v + 1)
        } catch (err) {
            setState(s => ({ ...s, error: err.response?.data?.message || 'Could not take it off. Try again.' }))
        } finally {
            setRemoving(null)
        }
    }

    const add = async (e) => {
        e.preventDefault()
        setState({ saving: true, error: '', added: null })
        try {
            const body = { name: name.trim(), ...mapPlaceOf(place) }
            const added = kind === 'LABEL' ? await addMapLabel(body) : await addMapFestival(body)
            reloadMapExtrasLater()
            setVersion(v => v + 1)
            setState({ saving: false, error: '', added: { kind, ...added } })
            setName('')
            setPlace(emptyMapPlace())
        } catch (err) {
            setState({ saving: false, error: err.response?.data?.message || 'Could not add it. Try again.', added: null })
        }
    }

    return (
        <section className="mt-8">
            <h2 className="panel__label">Add to the map</h2>
            <form className="panel grid gap-3" onSubmit={add}>
                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="What to add">
                    {[['LABEL', 'Label'], ['FESTIVAL', 'Festival']].map(([id, label]) => (
                        <button key={id} type="button" role="radio" aria-checked={kind === id}
                            className={'chip' + (kind === id ? ' is-on' : '')} onClick={() => setKind(id)}>{label}</button>
                    ))}
                </div>
                <input className="field" aria-label="Name" placeholder={kind === 'LABEL' ? 'Label name' : 'Festival name'}
                    maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} />
                <MapPlaceFields kind={kind} idPrefix="add-to-map" value={place} onChange={setPlace} />
                <div>
                    <button type="submit" className="btn btn--primary" disabled={state.saving || place.genres.length === 0}>
                        {state.saving ? 'Adding…' : 'Add to the map'}
                    </button>
                </div>
                {state.error && <p className="notice m-0">{state.error}</p>}
                {state.added && (
                    <p className="notice notice--ok m-0">
                        On the map now:{' '}
                        <Link className="link" to={state.added.kind === 'LABEL'
                            ? `/labels/${encodeURIComponent(state.added.name)}` : `/festivals/${encodeURIComponent(state.added.id)}`}>
                            {state.added.name}
                        </Link>. Link its owner on its edit page, or they claim it.
                    </p>
                )}
            </form>

            {extras && (extras.labels.length > 0 || extras.festivals.length > 0) && (
                <div className="panel mt-3">
                    <h3 className="panel__label">Added from the panel</h3>
                    <ul className="rows">
                        {[...extras.labels.map(l => ({ kind: 'LABEL', key: l.name, name: l.name, to: `/labels/${encodeURIComponent(l.name)}` })),
                            ...extras.festivals.map(f => ({ kind: 'FESTIVAL', key: f.id, name: f.name, to: `/festivals/${encodeURIComponent(f.id)}` }))]
                            .map(item => (
                                <li key={item.kind + item.key} className="rows__item">
                                    <span className="rows__name">
                                        <Link className="link" to={item.to}>{item.name}</Link>
                                        <span className="mono text-xs muted"> · {item.kind === 'LABEL' ? 'label' : 'festival'}</span>
                                    </span>
                                    <button type="button" className="btn btn--ghost btn--danger shrink-0" disabled={removing !== null}
                                        onClick={() => remove(item.kind, item.key, item.name)}>
                                        {removing === item.key ? 'Removing…' : 'Take off the map'}
                                    </button>
                                </li>
                            ))}
                    </ul>
                    <p className="mono text-xs muted mt-2 mb-0">The labels and festivals of the map files can't be taken off here.</p>
                </div>
            )}
        </section>
    )
}

export default AddToMap
