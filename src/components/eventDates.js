// "2026-10-24" as a local calendar day, so the browser can't move it to the day before
export function parseDay(value) {
    if (!value) return null
    const [year, month, day] = value.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
}
