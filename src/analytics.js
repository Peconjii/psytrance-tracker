// Visit counts without cookies (Umami): only when VITE_UMAMI_WEBSITE_ID is set (on Vercel, from the Umami account),
// and only in the built site. Umami counts page views itself, also when React Router changes the page.
export function startAnalytics() {
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
    if (!import.meta.env.PROD || !websiteId) return
    const script = document.createElement('script')
    script.defer = true
    script.src = import.meta.env.VITE_UMAMI_SRC || 'https://cloud.umami.is/script.js'
    script.dataset.websiteId = websiteId
    // Pages without their ?search=… part, and nothing at all from browsers that ask not to be tracked
    script.dataset.excludeSearch = 'true'
    script.dataset.doNotTrack = 'true'
    document.head.appendChild(script)
}
