import ArtistInput from './ArtistInput.jsx'
import { GenreOptions } from './AdminParts'
import { emptySet, emptyStage } from './stageText.js'

// The line-up of the event form as stages: each a card with its name, its genre (the sets of artists the map doesn't
// place fly to it in the live fleet) and its sets: day, start, end, artist and whether it is live.
// stages: [{ name, genreId, sets: [{ day, start, end, artist, live }] }]; days: eventDays() of the form.
function StageCards({ stages, onChange, days }) {
    const changeStage = (i, change) => onChange(stages.map((s, j) => (j === i ? { ...s, ...change } : s)))
    const changeSet = (i, k, change) => changeStage(i, { sets: stages[i].sets.map((set, l) => (l === k ? { ...set, ...change } : set)) })
    const addSet = (i) => {
        // A new set starts where the last one ends, on its day (the next one after midnight)
        const last = stages[i].sets[stages[i].sets.length - 1]
        const afterMidnight = last?.end && last.start && last.end < last.start
        const day = afterMidnight ? days[days.findIndex(d => d.value === last.day) + 1]?.value ?? last.day : last?.day || days[0]?.value || ''
        changeStage(i, { sets: [...stages[i].sets, emptySet(day, last?.end || '')] })
    }
    const removeSet = (i, k) => changeStage(i, { sets: stages[i].sets.length > 1 ? stages[i].sets.filter((_, l) => l !== k) : [emptySet()] })

    return (
        <div className="grid grid-cols-1 gap-3">
            {stages.map((stage, i) => (
                <div key={i} className="stage-card">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <input className="field flex-1 min-w-40" aria-label={`Name of stage ${i + 1}`} maxLength={60}
                            placeholder={stages.length > 1 ? 'Stage name' : 'Stage name (optional)'}
                            value={stage.name} onChange={(e) => changeStage(i, { name: e.target.value })} />
                        <select className="field w-auto" aria-label={`Genre of stage ${i + 1}`} value={stage.genreId}
                            onChange={(e) => changeStage(i, { genreId: e.target.value })}>
                            <option value="">Stage genre: none</option>
                            <GenreOptions />
                        </select>
                        {stages.length > 1 && (
                            <button type="button" className="btn btn--ghost" onClick={() => onChange(stages.filter((_, j) => j !== i))}
                                aria-label={`Remove stage ${stage.name || i + 1}`}>✕ Stage</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {stage.sets.map((set, k) => (
                            <div key={k} className="stage-set">
                                {days.length > 0 && (
                                    <select className="field w-auto" aria-label="Day" value={set.day || (set.start ? days[0].value : '')}
                                        onChange={(e) => changeSet(i, k, { day: e.target.value })}>
                                        {!set.start && <option value="">Day</option>}
                                        {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                )}
                                <span className="stage-set__time">
                                    <input className="field w-auto" type="time" aria-label="Starts" value={set.start}
                                        onChange={(e) => changeSet(i, k, { start: e.target.value, day: set.day || days[0]?.value || '' })} />
                                    <span className="muted">–</span>
                                    <input className="field w-auto" type="time" aria-label="Ends (optional)" value={set.end}
                                        onChange={(e) => changeSet(i, k, { end: e.target.value })} />
                                </span>
                                <span className="stage-set__artist">
                                    <ArtistInput aria-label="Artist" placeholder="Artist" maxLength={100}
                                        value={set.artist} onChange={(artist) => changeSet(i, k, { artist })} />
                                    <label className="mono text-xs muted inline-flex items-center gap-1 shrink-0">
                                        <input type="checkbox" checked={set.live} onChange={(e) => changeSet(i, k, { live: e.target.checked })} /> live
                                    </label>
                                    <button type="button" className="btn btn--ghost shrink-0" onClick={() => removeSet(i, k)}
                                        aria-label={`Remove ${set.artist || 'this set'}`}>✕</button>
                                </span>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="btn mt-2" onClick={() => addSet(i)}>+ Add set</button>
                </div>
            ))}
            <div>
                <button type="button" className="btn" onClick={() => onChange([...stages, emptyStage()])}>+ Add stage</button>
            </div>
        </div>
    )
}

export default StageCards
