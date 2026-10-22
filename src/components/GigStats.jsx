import { data, genreById } from '../map/data/types'
import StatView, { StatViewToggle } from './StatView.jsx'
import { useStatsView } from './statsView.js'

const SINCE = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' })

// The numbers of an artist or a label: gigs (next, before, live), where and in which sound, and the followers month by
// month. `stats` is what /api/artists/<slug>/stats or /api/labels/stats sends.
function GigStats({ stats, extraTiles = [] }) {
    const [view, toggleView] = useStatsView()
    const { gigs } = stats
    const tiles = [
        { value: gigs.total, label: 'Gigs counted' },
        { value: gigs.upcoming, label: 'Coming up' },
        { value: gigs.past, label: 'Played' },
        { value: stats.followers, label: stats.followers === 1 ? 'Follower' : 'Followers' },
        ...extraTiles,
    ]
    const genres = gigs.byGenre.filter(g => genreById[g.key]).map(g => {
        const genre = genreById[g.key]
        return { key: g.key, label: genre.name, value: g.count, color: data.families[genre.family].color }
    })
    const months = stats.followersByMonth.map(m => ({
        key: m.month, label: MONTH.format(new Date(m.month + '-15')), value: m.total,
    }))

    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {tiles.map(t => (
                    <div key={t.label} className="stat"><span className="stat__value">{t.value}</span><span className="stat__label">{t.label}</span></div>
                ))}
            </div>
            <div className="flex justify-end -mb-2"><StatViewToggle view={view} onToggle={toggleView} /></div>
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="field-label">Where</h3>
                    <StatView view={view} unit="gigs" rows={gigs.byCountry.map(c => ({ key: c.key, label: c.key, value: c.count }))} />
                </div>
                <div>
                    <h3 className="field-label">Sound of the events</h3>
                    <StatView view={view} unit="events" rows={genres} empty="No genres known yet." />
                </div>
                {gigs.byYear.length > 1 && (
                    <div>
                        <h3 className="field-label">By year</h3>
                        <StatView view={view} unit="gigs" rows={gigs.byYear.map(y => ({ key: y.key, label: y.key, value: y.count }))} />
                    </div>
                )}
                {months.length > 0 && (
                    <div>
                        <h3 className="field-label">Followers, month by month</h3>
                        <StatView view={view} kind="line" unit="followers" rows={months} />
                    </div>
                )}
            </div>
            {gigs.countedSince && (
                <p className="mono text-xs muted m-0">
                    Counted from the line-ups since {SINCE.format(new Date(gigs.countedSince + 'T12:00:00'))}
                    {gigs.live > 0 && ` · ${gigs.live} written as live sets`}.
                </p>
            )}
        </div>
    )
}

export default GigStats
