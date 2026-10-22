import { useState } from 'react'
import { SITE_URL } from '../hooks/usePageMeta.js'

// For the artist: "my next gigs" on their own website (an iframe that stays up to date) and the link for Linktree
function GigsWidgetCode({ slug }) {
    const [copied, setCopied] = useState('')
    const widget = `${SITE_URL}/embed/artists/${encodeURIComponent(slug)}`
    const page = `${SITE_URL}/artists/${encodeURIComponent(slug)}`
    const code = `<iframe src="${widget}" title="Next gigs" width="100%" height="420" style="border:0"></iframe>`

    const copy = async (what, text) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(what)
        } catch {
            setCopied('')
        }
    }

    return (
        <section className="panel mb-4 grid gap-3">
            <div>
                <h2 className="panel__label m-0">Your next gigs on your website</h2>
                <p className="muted text-sm mt-1 mb-0">
                    Paste this where your website takes HTML (an "embed" or "code" block): it always shows your next gigs
                    from the line-ups. <a className="link" href={widget} target="_blank" rel="noopener noreferrer">See it ↗</a>
                </p>
            </div>
            <textarea className="field mono text-xs" rows={3} readOnly value={code} aria-label="Widget code"
                onFocus={(e) => e.target.select()} />
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn" onClick={() => copy('code', code)}>Copy the code</button>
                <button type="button" className="btn btn--ghost" onClick={() => copy('link', page)}>Copy the link for Linktree</button>
                {copied && <span className="mono text-xs soft" role="status">{copied === 'code' ? 'Code copied.' : 'Link copied.'}</span>}
            </div>
        </section>
    )
}

export default GigsWidgetCode
