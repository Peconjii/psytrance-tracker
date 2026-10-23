import { Link, useLocation } from 'react-router-dom'

// Pages where the call would be in the way: the forms it leads to, account pages, editing and the admin panel
const QUIET = [/^\/new-page/, /^\/feedback/, /^\/admin/, /^\/(login|register|forgot-password|reset-password|verify-email)/, /\/edit$/, /^\/events\/new/]

// Above the footer on every page: the scene's own people (artists, labels, festivals, crews) are asked to make or
// take over their page and to tell us what's wrong, so the site grows and its facts get better
function JoinStrip() {
    const { pathname } = useLocation()
    if (QUIET.some(path => path.test(pathname))) return null

    return (
        <aside className="join-strip" aria-label="Get your page">
            <div className="join-strip__inner">
                <div className="min-w-0">
                    <div className="page-head__tag">// Open call · artists, labels, festivals, crews</div>
                    <p className="join-strip__title">DJ, producer, label, festival or organizer?</p>
                    <p className="join-strip__text">
                        Your page on Map of Psy is free. Make it, or take over the one we have, and keep your gigs, sound and
                        links right. Saw something wrong anywhere? Tell us.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Link className="btn btn--primary" to="/new-page">Get your page →</Link>
                    <Link className="btn btn--ghost" to="/feedback">✎ Report a mistake</Link>
                </div>
            </div>
        </aside>
    )
}

export default JoinStrip
