import { useAuth } from '../context/AuthContext'
import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import { Link } from 'react-router-dom'

function Profile() {
    const { user, logout } = useAuth()
    const { favorites } = useContext(FavoritesContext)

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <h2 className="text-3xl mb-4">You are not logged in.</h2>
                <Link to="/login" className="bg-purple-700 hover:bg-purple-500 text-white px-6 py-3 rounded-xl">
                    Go to Login
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center text-4xl mb-4">
                        👤
                    </div>
                    <h2 className="text-3xl font-bold mb-1">{user.username}</h2>
                    <p className="text-gray-400 mb-6">{user.email}</p>
                </div>

                <div className="bg-gray-700 p-4 rounded-xl mb-6 flex justify-between items-center">
                    <span className="text-gray-300">Saved Favorites:</span>
                    <span className="text-cyan-400 font-bold text-xl">{favorites.length} events</span>
                </div>

                <div className="flex flex-col gap-3">
                    <Link 
                        to="/favorites" 
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-center py-3 rounded-xl transition-colors duration-200"
                    >
                        View My Favorites
                    </Link>
                    <button 
                        onClick={logout} 
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl transition-colors duration-200 cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Profile