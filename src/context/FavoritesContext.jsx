import { useEffect, createContext, useState } from "react";
// CONTEXT OBJEKAT(KUTIJA KOJA CUVA PODATKE)
const FavoritesContext = createContext()

function FavoritesProvider({ children }) { //children je sve sto stavim unutar FavoritesProvider
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem("favorites")
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites))
    }, [favorites])


    return(
        <FavoritesContext.Provider value={{ favorites, setFavorites }}>
            {children}
        </FavoritesContext.Provider>
)}

export { FavoritesContext, FavoritesProvider }