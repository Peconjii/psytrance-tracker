import StatBars from './StatBars.jsx'
import StatChart from './StatChart.jsx'

// One group of numbers as a list or a chart, by the view the reader picked (see useStatsView)
function StatView({ view, kind = 'column', ...props }) {
    return view === 'chart' ? <StatChart kind={kind} {...props} /> : <StatBars {...props} />
}

// The "List / Chart" switch above the numbers
export function StatViewToggle({ view, onToggle }) {
    return (
        <div className="flex gap-1" role="group" aria-label="Show the numbers as">
            {[['list', 'List'], ['chart', 'Chart']].map(([value, label]) => (
                <button key={value} type="button" className={`chip${view === value ? ' is-on' : ''}`}
                    aria-pressed={view === value} onClick={() => view !== value && onToggle()}>{label}</button>
            ))}
        </div>
    )
}

export default StatView
