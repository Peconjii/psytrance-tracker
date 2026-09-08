import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import FavoriteCard from '../components/FavoriteCard'

function Favorites() {
    const { favorites } = useContext(FavoritesContext)

    return(
        favorites.length === 0 ? (
            <h2 className='text-dark text-center text-4xl py-8'>Favorites je prazan!</h2>
        ) : (
            <div className='grid grid-cols-3 gap-6 p-4'>
               {favorites.map(favorite => (
                    <FavoriteCard key={favorite.id} favorite={favorite} />
                ))}
            </div>
        )
    )
}

export default Favorites