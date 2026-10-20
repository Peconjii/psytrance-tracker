import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { FavoritesContext } from '../context/FavoritesContext'
import FavoriteCard from '../components/FavoriteCard'
import usePageMeta from '../hooks/usePageMeta.js'

function Favorites() {
    usePageMeta({ title: 'Favorites', path: '/favorites', noindex: true })
    const { favorites } = useContext(FavoritesContext)

    return (
        <div className="page page--wide">
            <header className="page-head">
                <div className="page-head__tag">// Your log</div>
                <h1 className="page-title">Favorites</h1>
                <p className="page-head__sub">The events you saved.</p>
            </header>

            {favorites.length === 0 ? (
                <div className="empty">
                    <p><strong>No favorites yet.</strong></p>
                    <p>Press ♡ on an <Link to="/events" className="link">event</Link> to keep it here.</p>
                </div>
            ) : (
                <div className="tickets">
                    {favorites.map(favorite => (
                        <FavoriteCard key={favorite.id} favorite={favorite} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default Favorites
