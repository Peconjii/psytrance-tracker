import { useState } from 'react'

const HEIGHT = 170
const PAD = { top: 18, right: 12, bottom: 34, left: 30 }
const BAR = 24

// Clean y-axis steps: 0 / 1 / 2 ... or 0 / 5 / 10, never "3.33"
function ticks(max) {
    const raw = max / 4
    const step = Math.max(1, [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => s >= raw) ?? Math.ceil(raw / 100) * 100)
    const top = Math.max(step, Math.ceil(max / step) * step)
    const out = []
    for (let v = 0; v <= top; v += step) out.push(v)
    return { top, values: out }
}

// A column with a 4px rounded data-end and a square baseline
function columnPath(x, y, w, h) {
    const r = Math.min(4, h, w / 2)
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

// The statistics as a chart: columns for counts (countries, genres, years), or a line for a running total
// (followers over the months). One series, so no legend: the heading above says what it is. Hovering a column or a
// point shows its value; the list view next to it is the table of the same numbers.
// rows: [{ key, label, value, color? }]
function StatChart({ rows, unit, kind = 'column', empty = 'Nothing yet.' }) {
    const [hover, setHover] = useState(null)
    if (!rows.length) return <p className="muted text-sm m-0">{empty}</p>

    const width = Math.max(300, rows.length * 52 + PAD.left + PAD.right)
    const plotW = width - PAD.left - PAD.right
    const plotH = HEIGHT - PAD.top - PAD.bottom
    const { top, values } = ticks(Math.max(...rows.map(r => r.value)))
    const y = (v) => PAD.top + plotH - (v / top) * plotH
    const band = plotW / rows.length
    const cx = (i) => PAD.left + band * i + band / 2
    const max = Math.max(...rows.map(r => r.value))
    const shown = hover === null ? null : rows[hover]
    const line = rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i)},${y(r.value)}`).join(' ')

    return (
        <div className="stat-chart">
            <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img"
                aria-label={rows.map(r => `${r.label}: ${r.value} ${unit}`).join(', ')} onMouseLeave={() => setHover(null)}>
                {values.map(v => (
                    <g key={v}>
                        <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className="stat-chart__grid" />
                        <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="stat-chart__tick">{v}</text>
                    </g>
                ))}
                {kind === 'line' ? (
                    <>
                        <path d={`${line} L${cx(rows.length - 1)},${y(0)} L${cx(0)},${y(0)} Z`} className="stat-chart__area" />
                        <path d={line} className="stat-chart__line" />
                        {rows.map((r, i) => (i === rows.length - 1 || hover === i) && (
                            <circle key={r.key} cx={cx(i)} cy={y(r.value)} r={4.5} className="stat-chart__dot" />
                        ))}
                        {hover !== null && <line x1={cx(hover)} x2={cx(hover)} y1={PAD.top} y2={y(0)} className="stat-chart__cross" />}
                        <text x={cx(rows.length - 1)} y={y(rows[rows.length - 1].value) - 9} textAnchor="end" className="stat-chart__value">
                            {rows[rows.length - 1].value}
                        </text>
                    </>
                ) : (
                    rows.map((r, i) => {
                        const w = Math.min(BAR, band - 6)
                        const h = Math.max(1, y(0) - y(r.value))
                        return (
                            <g key={r.key}>
                                <path d={columnPath(cx(i) - w / 2, y(0) - h, w, h)} fill={r.color ?? 'var(--accent)'}
                                    opacity={hover === null || hover === i ? 1 : 0.45} />
                                {/* Only the biggest gets its number on the cap; hover shows the rest */}
                                {r.value === max && hover === null && (
                                    <text x={cx(i)} y={y(r.value) - 5} textAnchor="middle" className="stat-chart__value">{r.value}</text>
                                )}
                            </g>
                        )
                    })
                )}
                {rows.map((r, i) => (
                    <g key={r.key}>
                        <text x={cx(i)} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" className="stat-chart__tick">
                            {r.label.length > 7 ? r.label.slice(0, 6) + '…' : r.label}
                        </text>
                        {/* The hover target: the whole band, bigger than the mark */}
                        <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent"
                            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
                            aria-label={`${r.label}: ${r.value} ${unit}`} />
                    </g>
                ))}
            </svg>
            <p className="stat-chart__tip mono text-xs m-0" aria-live="polite">
                {shown ? <><strong>{shown.label}</strong> · {shown.value} {unit}</> : <span className="muted">Point at a {kind === 'line' ? 'month' : 'column'} for its number</span>}
            </p>
        </div>
    )
}

export default StatChart
