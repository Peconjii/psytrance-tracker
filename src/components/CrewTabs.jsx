import { NavLink } from 'react-router-dom'

// Artists and organizers are two lists of the same crew: tabs between them
function CrewTabs() {
    const tab = ({ isActive }) => `chip no-underline${isActive ? ' is-on' : ''}`
    return (
        <nav className="flex flex-wrap gap-2 mb-6" aria-label="Crew">
            <NavLink to="/artists" end className={tab}>Artists</NavLink>
            <NavLink to="/organizers" end className={tab}>Organizers</NavLink>
        </nav>
    )
}

export default CrewTabs
