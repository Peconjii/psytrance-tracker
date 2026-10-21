// A page of this site ("/events/123", "/?genre=forest"), not another site ("https://...", "//...", "/\...").
// The feedback form only sends such paths, and the admin inbox only links to them (the backend checks it too).
export function isSitePath(url) {
    return typeof url === 'string' && /^\/(?![/\\])/.test(url)
}
