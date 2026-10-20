import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setReducedMotion, useReducedMotion } from '../motion.js'

function Navbar() {
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()
    const reducedMotion = useReducedMotion()

    const navLinks = [
        { path: '/', label: 'Galaxy' },
        { path: '/events', label: 'Events' },
        { path: '/map', label: 'World map' },
        { path: '/artists', label: 'Artists' },
        { path: '/feedback', label: 'Feedback' },
        // Profile is the username button on the right
        ...(user ? [{ path: '/favorites', label: 'Favorites' }] : []),
        // Only admins read the feedback (the backend checks it again)
        ...(user?.admin ? [{ path: '/admin/feedback', label: 'Inbox' }] : [])
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
                    {/* The galaxy page has the big MAP OF PSY title of its own, so the name isn't repeated there */}
                    {location.pathname !== '/' && <span className="site-nav__brand">MAP OF PSY</span>}
                </Link>

                <div className="site-nav__links">
                    {navLinks.map(link => (
                        <Link key={link.path} to={link.path} className={linkClass(link.path)}
                            aria-current={isActive(link.path) ? 'page' : undefined}>
                            {link.label}
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
                            {link.label}
                        </Link>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-3">{motionButton}{authLinks}</div>
                </div>
            )}
        </nav>
    )
}

export default Navbar
