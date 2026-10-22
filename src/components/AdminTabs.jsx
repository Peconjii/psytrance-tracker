import { NavLink } from 'react-router-dom'

// The admin side's sections, shown at the top of each admin page
function AdminTabs() {
    const tab = ({ isActive }) => `chip no-underline${isActive ? ' is-on' : ''}`
    return (
        <nav className="flex flex-wrap gap-2 mb-6" aria-label="Admin">
            <NavLink to="/admin/feedback" className={tab}>Feedback inbox</NavLink>
            <NavLink to="/admin/genres" className={tab}>Artist genres</NavLink>
            <NavLink to="/admin/events" className={tab}>Events</NavLink>
            <NavLink to="/admin/requests" className={tab}>Artist requests</NavLink>
            <NavLink to="/admin/history" className={tab}>History</NavLink>
        </nav>
    )
}

export default AdminTabs
