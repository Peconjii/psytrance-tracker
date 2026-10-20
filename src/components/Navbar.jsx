import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()

    const navLinks = [
        { path: '/', label: 'Galaxy' },
        { path: '/events', label: 'Events' },
        { path: '/map', label: 'World map' },
        { path: '/artists', label: 'Artists' },
        ...(user ? [
            { path: '/favorites', label: 'Favorites' },
            { path: '/profile', label: 'Profile' }
        ] : [])
    ]

    // An event or artist page counts as its section, so /events/123 still lights up "Events"
    const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
    const linkClass = (path) => `site-nav__link${isActive(path) ? ' is-active' : ''}`

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
        <nav className="site-nav">
            <div className="site-nav__inner">
                <Link to="/" className="site-nav__home" aria-label="Psytrance Event Tracker, home">
                    <img src="/logo.svg" alt="" className="site-nav__logo" width="50" height="32" />
                    <span className="site-nav__brand">PSYTRANCE EVENT TRACKER</span>
                </Link>

                <div className="site-nav__links">
                    {navLinks.map(link => (
                        <Link key={link.path} to={link.path} className={linkClass(link.path)}
                            aria-current={isActive(link.path) ? 'page' : undefined}>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="site-nav__auth">{authLinks}</div>

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
                    <div className="flex gap-2 pt-3">{authLinks}</div>
                </div>
            )}
        </nav>
    )
}

export default Navbar
