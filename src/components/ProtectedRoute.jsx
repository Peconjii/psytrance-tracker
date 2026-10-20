import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    // Wait for AuthContext to check a saved token before deciding, or a refresh would bounce to /login
    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="mono text-xs muted tracking-widest">CHECKING YOUR ACCOUNT...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute