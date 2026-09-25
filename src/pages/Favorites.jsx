import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import FavoriteCard from '../components/FavoriteCard'

function Favorites() {
    const { favorites } = useContext(FavoritesContext)

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    Your Favorite Gatherings
                </h1>
                <p className="text-slate-400 text-sm mt-1">Manage and review your bookmarked psytrance events</p>
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/60 backdrop-blur-md rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] max-w-xl mx-auto">
                    <p className="text-slate-300 text-lg font-medium">No favorites yet</p>
                    <p className="text-slate-500 text-xs mt-1">Explore events and add them to your favorites list.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map(favorite => (
                        <FavoriteCard key={favorite.id} favorite={favorite} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default Favorites