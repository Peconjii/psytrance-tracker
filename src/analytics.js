import { inject } from '@vercel/analytics'

// Visit counts without cookies (Vercel Web Analytics, turned on in the Vercel project → Analytics), only in the
// built site. It counts which pages are opened, also when React Router changes the page, and where visitors came
// from; no cookies and nothing that follows a person from site to site.
export function startAnalytics() {
    if (!import.meta.env.PROD) return
    inject({ mode: 'production' })
}
