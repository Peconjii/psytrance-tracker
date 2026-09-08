import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function Navbar() {
    const { user, logout } = useAuth()

    return (
        <nav className="flex justify-between bg-gray-900 px-6 py-2 items-center">
            <Link to="/" className="text-white text-xl font-bold">
                Psytrance Event Tracker
            </Link>
            <div className="flex text-purple-400 text-xl items-center gap-2">
                <Link to="/" className="p-3 hover:text-cyan-400">Home</Link>
                <Link to="/events" className="p-3 hover:text-cyan-400">Events</Link>
                <Link to="/favorites" className="p-3 hover:text-cyan-400">Favorites</Link>

                {user ? (
                    <>
                        <Link to="/profile" className="p-3 text-cyan-400 hover:text-cyan-300">
                            👤 {user.username}
                        </Link>
                        <button onClick={logout} className="p-3 hover:text-red-400 cursor-pointer">
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/register" className="p-3 hover:text-cyan-400">Register</Link>
                        <Link to="/login" className="p-3 hover:text-cyan-400">Login</Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar