import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    // Wait for AuthContext to check a saved token before deciding, or a refresh would bounce to /login
    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <p className="text-cyan-400 text-lg animate-pulse tracking-widest">[ CHECKING AUTHENTICATION... ]</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute