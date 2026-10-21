import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// The admin pages: guests go to /login, other users see a note. The backend checks the admin rights on every
// request; this only keeps the pages from loading for everyone else.
function AdminOnly({ children }) {
    const { user } = useAuth()
    if (!user?.admin) {
        return <div className="page page--narrow"><p className="notice">This page is for admins.</p></div>
    }
    return children
}

function AdminRoute({ children }) {
    return (
        <ProtectedRoute>
            <AdminOnly>{children}</AdminOnly>
        </ProtectedRoute>
    )
}

export default AdminRoute
