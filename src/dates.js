// Date formats shared by the site's pages (en-GB: "Fri 7 Nov", "7 Nov 2026"). A format used on one page only stays
// on that page.

/** Fri 7 Nov */
export const WEEKDAY_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
/** 7 Nov 2026 */
export const DAY_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
/** 7 Nov, 21:30 */
export const DAY_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** 7 Nov 2026, 21:30 */
export const DAY_YEAR_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/** November 2026 */
export const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

/** Midnight at the start of today, in the visitor's time zone */
export function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** A day from the backend ("2026-11-07") in a format, or "Date TBA". Noon, so no time zone moves it a day. */
export const formatDay = (iso, format) => (iso ? format.format(new Date(iso + 'T12:00:00')) : 'Date TBA')

/** A date and time from the backend as the value of an <input type="datetime-local"> ("2026-11-07T21:30") */
export const toField = (value) => (value ? value.slice(0, 16) : '')
