// A small horizontal bar list: one row per item with its name, a thin bar and the number (in text color, so the
// bar is never the only way to read it). One series, so no legend; each bar can take its own color (a genre's).
// rows: [{ key, label, value, color? }]
function StatBars({ rows, unit, empty = 'Nothing yet.' }) {
    if (!rows.length) return <p className="muted text-sm m-0">{empty}</p>
    const max = Math.max(...rows.map(r => r.value), 1)
    return (
        <ul className="stat-bars">
            {rows.map(r => (
                <li key={r.key} className="stat-bars__row" title={`${r.label}: ${r.value} ${unit}`}>
                    <span className="stat-bars__label">{r.label}</span>
                    <span className="stat-bars__track" aria-hidden="true">
                        <span className="stat-bars__bar" style={{ width: `${(r.value / max) * 100}%`, ...(r.color ? { background: r.color } : {}) }} />
                    </span>
                    <span className="stat-bars__value">{r.value}</span>
                </li>
            ))}
        </ul>
    )
}

export default StatBars
