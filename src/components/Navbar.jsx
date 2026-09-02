import { Link } from "react-router-dom"

function Navbar() {
    return (
        <nav className="flex justify-between bg-gray-900">
            <span className="text-white text-xl p-4">Psytrance event tracker!~</span>
            <div className="flex text-purple-400 text-xl justify-between transition-colors duration-200">
                <Link to={"/"} className="p-4 hover:text-cyan-400">Home</Link>
                <Link to={"/events"} className="p-4 hover:text-cyan-400">Events</Link>
                <Link to={"/favorites"} className="p-4 hover:text-cyan-400">Favorites</Link>
                <Link to={"/register"} className="p-4 hover:text-cyan-400">Register</Link>
                <Link to={"/login"} className="p-4 hover:text-cyan-400">Login</Link>

            </div>
        </nav>
    )
}

export default Navbar