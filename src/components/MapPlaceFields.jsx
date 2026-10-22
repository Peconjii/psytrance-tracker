import { AddGenre, GenreChip } from './AdminParts'

const MAX_GENRES = 6

// What a label or festival needs to go on the map: its genres (they decide where its marker sits, near their stars),
// the year it started and, for a festival, a few words. value: { country, since, description, genres }.
function MapPlaceFields({ kind, value, onChange, idPrefix }) {
    const set = (change) => onChange({ ...value, ...change })
    return (
        <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
                {value.genres.map(id => (
                    <GenreChip key={id} id={id} onRemove={() => set({ genres: value.genres.filter(g => g !== id) })} />
                ))}
                {value.genres.length < MAX_GENRES && (
                    <AddGenre exclude={value.genres} onAdd={(id) => set({ genres: [...value.genres, id] })}
                        label={`Genre of the ${kind === 'FESTIVAL' ? 'festival' : 'label'}`} />
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input id={`${idPrefix}-country`} className="field flex-1 min-w-32" aria-label="Country" placeholder="Country"
                    maxLength={100} value={value.country} onChange={(e) => set({ country: e.target.value })} />
                <input id={`${idPrefix}-since`} className="field" style={{ width: '9rem' }} aria-label="Since (year)" placeholder="Since (year)"
                    inputMode="numeric" maxLength={4} value={value.since} onChange={(e) => set({ since: e.target.value.replace(/\D/g, '') })} />
            </div>
            {kind === 'FESTIVAL' && (
                <textarea className="field" rows={2} maxLength={1000} aria-label="About the festival"
                    placeholder="About the festival: where, how big, what it sounds like"
                    value={value.description} onChange={(e) => set({ description: e.target.value })} />
            )}
            <p className="mono text-xs muted m-0">The genres decide where it sits on the map: next to their stars.</p>
        </div>
    )
}

export default MapPlaceFields
