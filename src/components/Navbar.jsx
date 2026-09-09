import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
    const { user, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const location = useLocation()

    const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/events', label: 'Events' },
    { path: '/map', label: 'Map' },
    ...(user ? [
        { path: '/favorites', label: 'Favorites' },
        { path: '/profile', label: 'Profile' }
    ] : [])
]

    return (
        <nav className="sticky top-0 z-50 w-full px-4 py-3">
            <div className="max-w-7xl mx-auto backdrop-blur-md bg-slate-900/60 border border-cyan-500/30 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.15)] px-6 py-3 flex items-center justify-between">
                
                {/* Logo / Brand */}
                <Link to="/" className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                    Psytrance Event Tracker
                </Link>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-2">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.path
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                    isActive
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                        : 'text-purple-300 hover:text-cyan-400 hover:bg-slate-800/60'
                                }`}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                </div>

                {/* Desktop Auth Section */}
                <div className="hidden md:flex items-center gap-3">
                    {user ? (
                        <>
                            <Link 
                                to="/profile" 
                                className="px-4 py-2 text-sm font-medium rounded-xl text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 transition-all"
                            >
                                👤 {user.username}
                            </Link>
                            <button 
                                onClick={logout} 
                                className="px-4 py-2 text-sm font-medium rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link 
                                to="/register" 
                                className="px-4 py-2 text-sm font-medium rounded-xl text-purple-300 hover:text-cyan-400 transition-all"
                            >
                                Register
                            </Link>
                            <Link 
                                to="/login" 
                                className="px-4 py-2 text-sm font-medium rounded-xl text-cyan-300 hover:text-white border border-cyan-500/20 hover:border-cyan-400/60 hover:bg-cyan-500/10 transition-all"
                            >
                                Login
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden text-cyan-400 focus:outline-none p-2 rounded-lg bg-slate-800/50 border border-cyan-500/30"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            {isOpen && (
                <div className="md:hidden max-w-7xl mx-auto mt-2 p-4 backdrop-blur-xl bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col gap-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-3 rounded-xl text-base font-medium text-slate-200 hover:text-cyan-400 hover:bg-slate-900/80 transition-all"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="h-[1px] bg-slate-800 my-1" />
                    {user ? (
                        <>
                            <Link
                                to="/profile"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-3 rounded-xl text-base font-medium text-cyan-400 hover:bg-slate-900/80 transition-all"
                            >
                                👤 {user.username}
                            </Link>
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-red-400 hover:bg-slate-900/80 transition-all cursor-pointer"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/register"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-3 rounded-xl text-base font-medium text-purple-300 hover:bg-slate-900/80 transition-all"
                            >
                                Register
                            </Link>
                            <Link
                                to="/login"
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-3 rounded-xl text-base font-medium text-cyan-300 hover:bg-slate-900/80 transition-all"
                            >
                                Login
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}

export default Navbar