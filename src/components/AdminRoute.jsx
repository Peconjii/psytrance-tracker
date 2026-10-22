import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// The admin pages: guests go to /login, other users see a note. The backend checks the rights on every request;
// this only keeps the pages from loading for everyone else. `editors`: an editor may use this page too.
function AdminOnly({ editors, children }) {
    const { user } = useAuth()
    if (!(user?.admin || (editors && user?.editor))) {
        return <div className="page page--narrow"><p className="notice">{user?.editor ? 'This page is for admins.' : 'This page is for admins and editors.'}</p></div>
    }
    return children
}

function AdminRoute({ editors = false, children }) {
    return (
        <ProtectedRoute>
            <AdminOnly editors={editors}>{children}</AdminOnly>
        </ProtectedRoute>
    )
}

export default AdminRoute
