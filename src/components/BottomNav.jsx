import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setReducedMotion, useReducedMotion } from '../motion.js'
import { highContrast, setTheme } from '../theme.js'
import { setGalaxyYear, toggleGalaxyTravel, useGalaxyYear } from '../galaxyYear.js'

// Phones only (site.css): the site's pages as a bar at the bottom, in reach of the thumb, like an app.
// "More" opens a sheet with the other pages, the settings and, on the galaxy, the year slider.
const TABS = [
    { path: '/', label: 'Galaxy', icon: '✦' },
    { path: '/events', label: 'Events', icon: '▤' },
    { path: '/map', label: 'Map', icon: '◎' },
    { path: '/search', label: 'Search', icon: '⌕' },
]

function BottomNav() {
    const { pathname } = useLocation()
    // Open on the page where it was opened: going to another page closes it
    const [moreOn, setMoreOn] = useState(null)
    const more = moreOn === pathname
    const setMore = (open) => setMoreOn(open ? pathname : null)
    const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path)

    return (
        <>
            {more && <MoreSheet onClose={() => setMore(false)} />}
            <nav className="bottom-nav" aria-label="Main">
                {TABS.map(tab => (
                    <Link key={tab.path} to={tab.path} className={isActive(tab.path) && !more ? 'bottom-nav__tab is-active' : 'bottom-nav__tab'}
                        aria-current={isActive(tab.path) ? 'page' : undefined}>
                        <span aria-hidden="true">{tab.icon}</span>{tab.label}
                    </Link>
                ))}
                <button type="button" className={more ? 'bottom-nav__tab is-active' : 'bottom-nav__tab'}
                    onClick={() => setMore(!more)} aria-expanded={more} aria-controls="more-sheet">
                    <span aria-hidden="true">☰</span>More
                </button>
            </nav>
        </>
    )
}

function MoreSheet({ onClose }) {
    const { user, logout } = useAuth()
    const reducedMotion = useReducedMotion()
    const galaxy = useGalaxyYear()

    // Escape closes it, like the other sheets
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const pages = [
        { path: '/artists', label: 'Artists' },
        { path: '/labels', label: 'Labels' },
        { path: '/festivals', label: 'Festivals' },
        { path: '/events/new', label: '+ Add an event' },
        ...(user ? [{ path: '/favorites', label: 'Favorites' }] : []),
        { path: '/feedback', label: 'Feedback' },
        { path: '/about', label: 'About' },
        ...(user?.editor ? [{ path: '/admin', label: 'Admin' }] : []),
    ]

    return (
        <>
            <button type="button" className="more-sheet__scrim" aria-label="Close the menu" onClick={onClose} />
            <div id="more-sheet" className="more-sheet" role="dialog" aria-label="More">
                <span className="more-sheet__grab" aria-hidden="true" />
                {galaxy.active && (
                    <div className="more-sheet__year">
                        <button type="button" className="timeline__play" onClick={toggleGalaxyTravel} aria-pressed={galaxy.traveling}
                            aria-label={galaxy.traveling ? 'Pause the time machine' : 'Play history from 1965'}>
                            {galaxy.traveling ? '❚❚' : '▶'}
                        </button>
                        <label htmlFor="more-year" className="mono text-xs muted">Year on the map</label>
                        <input id="more-year" type="range" min={galaxy.min} max={galaxy.max} value={galaxy.year}
                            onChange={(e) => setGalaxyYear(Number(e.target.value))} />
                        <output htmlFor="more-year" className="mono">{galaxy.year}</output>
                    </div>
                )}
                <nav className="more-sheet__pages" aria-label="Pages">
                    {pages.map(p => <Link key={p.path} to={p.path}>{p.label}</Link>)}
                </nav>
                <div className="more-sheet__settings">
                    <button type="button" className="btn btn--ghost" onClick={() => setTheme(highContrast ? 'cosmic' : 'contrast')} aria-pressed={highContrast}>
                        Contrast {highContrast ? 'on' : 'off'}
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => setReducedMotion(!reducedMotion)} aria-pressed={!reducedMotion}>
                        Motion {reducedMotion ? 'off' : 'on'}
                    </button>
                </div>
                <div className="more-sheet__account">
                    {user ? (
                        <>
                            <Link to="/profile" className="btn btn--ghost">{user.username}</Link>
                            <button type="button" className="btn btn--danger" onClick={() => { logout(); onClose() }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/register" className="btn btn--ghost">Register</Link>
                            <Link to="/login" className="btn">Login</Link>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

export default BottomNav
