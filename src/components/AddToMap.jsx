import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addMapFestival, addMapLabel } from '../api/backend.js'
import { reloadMapExtrasLater } from '../map/data/extras'
import MapPlaceFields from './MapPlaceFields.jsx'
import { emptyMapPlace, mapPlaceOf } from './mapPlace.js'

// For admins: put a label or festival on the map without a change to the map files or a deploy. Its marker sits
// next to the stars of its genres; its owner can then claim the page (or an admin links one).
function AddToMap() {
    const [kind, setKind] = useState('LABEL')
    const [name, setName] = useState('')
    const [place, setPlace] = useState(emptyMapPlace)
    const [state, setState] = useState({ saving: false, error: '', added: null })

    const add = async (e) => {
        e.preventDefault()
        setState({ saving: true, error: '', added: null })
        try {
            const body = { name: name.trim(), ...mapPlaceOf(place) }
            const added = kind === 'LABEL' ? await addMapLabel(body) : await addMapFestival(body)
            reloadMapExtrasLater()
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
        </section>
    )
}

export default AddToMap
