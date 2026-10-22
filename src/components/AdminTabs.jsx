import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// The admin side's sections; `editors`: an editor sees it too (the content), the rest is for admins only
const TABS = [
    { to: '/admin', label: 'Dashboard', editors: true },
    { to: '/admin/feedback', label: 'Feedback inbox' },
    { to: '/admin/genres', label: 'Artist genres', editors: true },
    { to: '/admin/events', label: 'Events', editors: true },
    { to: '/admin/our-events', label: 'Added events', editors: true },
    { to: '/admin/requests', label: 'Requests' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/reviews', label: 'Reviews', editors: true },
    { to: '/admin/history', label: 'History' },
]

// The admin side's sections, shown at the top of each admin page
function AdminTabs() {
    const { user } = useAuth()
    const tab = ({ isActive }) => `chip no-underline${isActive ? ' is-on' : ''}`
    return (
        <nav className="flex flex-wrap gap-2 mb-6" aria-label="Admin">
            {TABS.filter(t => user?.admin || t.editors).map(t => (
                <NavLink key={t.to} to={t.to} end={t.to === '/admin'} className={tab}>{t.label}</NavLink>
            ))}
        </nav>
    )
}

export default AdminTabs
