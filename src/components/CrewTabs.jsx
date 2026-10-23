import { NavLink } from 'react-router-dom'

// The directory of the scene: artists, organizers, labels and festivals, as tabs between their lists
function CrewTabs() {
    const tab = ({ isActive }) => `chip no-underline${isActive ? ' is-on' : ''}`
    return (
        <nav className="flex flex-wrap gap-2 mb-6" aria-label="Crew">
            <NavLink to="/artists" end className={tab}>Artists</NavLink>
            <NavLink to="/organizers" end className={tab}>Organizers</NavLink>
            <NavLink to="/labels" end className={tab}>Labels</NavLink>
            <NavLink to="/festivals" end className={tab}>Festivals</NavLink>
        </nav>
    )
}

export default CrewTabs
