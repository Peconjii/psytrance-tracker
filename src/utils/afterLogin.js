// Where to go after logging in, e.g. back to a crew link. Kept for this browser tab only.
const KEY = 'mapofpsy.afterLogin'

export function rememberAfterLogin(path) {
    try { sessionStorage.setItem(KEY, path) } catch { /* private mode: they land on /events */ }
}

// The remembered path (once), or the fallback
export function takeAfterLogin(fallback = '/events') {
    try {
        const path = sessionStorage.getItem(KEY)
        sessionStorage.removeItem(KEY)
        return path && path.startsWith('/') ? path : fallback
    } catch {
        return fallback
    }
}
