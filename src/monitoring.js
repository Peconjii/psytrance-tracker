// Errors in visitors' browsers reported to Sentry, so a broken page is known before someone writes about it.
// Only when VITE_SENTRY_LOADER_URL is set (on Vercel: the "Loader Script" address from the Sentry project,
// https://js.sentry-cdn.com/<key>.min.js), and only in the built site.
export function startErrorReports() {
    const loader = import.meta.env.VITE_SENTRY_LOADER_URL
    if (!import.meta.env.PROD || !loader || !loader.startsWith('https://js.sentry-cdn.com/')) return
    const script = document.createElement('script')
    script.src = loader
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
}
