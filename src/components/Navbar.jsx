import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAdminWaiting } from '../api/backend.js'
import { setReducedMotion, useReducedMotion } from '../motion.js'

function Navbar() {
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()
    const reducedMotion = useReducedMotion()
    // For admins: how many things wait for them (new messages, events, requests), next to "Admin"
    const [waiting, setWaiting] = useState({ userId: null, total: 0 })
    const checkedAt = useRef(0)
    useEffect(() => {
        if (!user?.admin) return
        // Asked again when moving between pages, at most once a minute
        if (Date.now() - checkedAt.current < 60_000 && waiting.userId === user.id) return
        checkedAt.current = Date.now()
        fetchAdminWaiting().then(w => setWaiting({ userId: user.id, total: w.total })).catch(() => {})
    }, [user, location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
    const waitingCount = user?.admin && waiting.userId === user.id ? waiting.total : 0

    const navLinks = [
        { path: '/', label: 'Galaxy' },
        { path: '/events', label: 'Events' },
        { path: '/map', label: 'World map' },
        { path: '/artists', label: 'Artists' },
        { path: '/feedback', label: 'Feedback' },
        // Profile is the username button on the right
        ...(user ? [{ path: '/favorites', label: 'Favorites' }] : []),
        // Only admins see the admin panel (the backend checks it again)
        ...(user?.admin ? [{ path: '/admin', label: 'Admin', count: waitingCount }] : [])
    ]

    // An event or artist page counts as its section, so /events/123 still lights up "Events"
    const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    const linkClass = (path) => `site-nav__link${isActive(path) ? ' is-active' : ''}`

    // Site-wide reduced motion; starts from the system setting
    const motionButton = (
        <button className="btn btn--ghost" onClick={() => setReducedMotion(!reducedMotion)} aria-pressed={!reducedMotion}
            title={reducedMotion ? 'Turn animations back on' : 'Stop the animations (stars, ships, camera flights)'}>
            Motion {reducedMotion ? 'off' : 'on'}
        </button>
    )

    const authLinks = user ? (
        <>
            <Link to="/profile" className="btn btn--ghost" onClick={() => setIsOpen(false)}>{user.username}</Link>
            <button onClick={() => { logout(); setIsOpen(false) }} className="btn btn--danger">Logout</button>
        </>
    ) : (
        <>
            <Link to="/register" className="btn btn--ghost" onClick={() => setIsOpen(false)}>Register</Link>
            <Link to="/login" className="btn" onClick={() => setIsOpen(false)}>Login</Link>
        </>
    )

    return (
        // On the galaxy page the map's own menu has the pages too, so phones get one menu, not two
        <nav className={location.pathname === '/' ? 'site-nav site-nav--home' : 'site-nav'}>
            <div className="site-nav__inner">
                <Link to="/" className="site-nav__home" aria-label="Map of Psy, home">
                    <img src="/logo.svg" alt="" className="site-nav__logo" width="50" height="32" />
                </Link>

                <div className="site-nav__links">
                    {navLinks.map(link => (
                        <Link key={link.path} to={link.path} className={linkClass(link.path)}
                            aria-current={isActive(link.path) ? 'page' : undefined}>
                            {link.label}{link.count > 0 && <span className="site-nav__count" title={`${link.count} waiting for you`}>{link.count}</span>}
                        </Link>
                    ))}
                </div>

                <div className="site-nav__auth">{motionButton}{authLinks}</div>

                <button
                    onClick={() => setIsOpen(open => !open)}
                    className="btn site-nav__burger"
                    aria-expanded={isOpen}
                    aria-controls="site-nav-mobile"
                >
                    {isOpen ? '✕ Close' : '☰ Menu'}
                </button>
            </div>

            {isOpen && (
                <div id="site-nav-mobile" className="site-nav__mobile">
                    {navLinks.map(link => (
                        <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className={linkClass(link.path)}>
                            {link.label}{link.count > 0 && <span className="site-nav__count">{link.count}</span>}
                        </Link>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-3">{motionButton}{authLinks}</div>
                </div>
            )}
        </nav>
    )
}

export default Navbar
