import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    // Dok se provera autentifikacije učitava, prikaži utišanu poruku
    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <p className="text-cyan-400 text-lg animate-pulse tracking-widest">[ CHECKING AUTHENTICATION... ]</p>
            </div>
        )
    }

    // Ako korisnik nije ulogovan, preusmeri ga na /login
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Ako je ulogovan, prikaži traženu stranicu
    return children
}

export default ProtectedRoute