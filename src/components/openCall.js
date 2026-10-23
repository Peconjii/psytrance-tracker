// Pages where the open call (JoinStrip) above the footer would be in the way: the forms it leads to, account pages,
// editing and the admin panel. The events list scrolls without end, so nobody reaches its footer: it shows the call
// in its head instead.
const QUIET = [
    /^\/events$/, /^\/new-page/, /^\/feedback/, /^\/admin/,
    /^\/(login|register|forgot-password|reset-password|verify-email)/, /\/edit$/, /^\/events\/new/,
]

export function showsOpenCall(pathname) {
    return !QUIET.some(path => path.test(pathname))
}
