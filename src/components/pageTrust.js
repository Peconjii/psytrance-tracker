// What a trusted owner may do on their own page without waiting for an admin (backend: PageTrust): as the admin
// reads it, as the trusted owner reads it, and what waits for an admin until then. DJs, producers and live acts are
// trusted the same way: the role is a label, not a set of rights.
export const TRUST_POWERS = {
    ARTIST: {
        admin: 'their new name or genres go live at once',
        trusted: 'a new name or genres go live at once',
        waiting: 'a new name or genres',
    },
    ORGANIZER: {
        admin: 'events they add as this organizer go live at once',
        trusted: 'events you add as this organizer go live at once',
        waiting: 'events you add',
    },
    LABEL: {
        admin: 'artists they put on or take off the crew go live at once',
        trusted: 'artists joining or leaving the crew go live at once',
        waiting: 'artists joining or leaving the crew',
    },
    FESTIVAL: {
        admin: 'they mark which events are the festival’s editions',
        trusted: 'you mark which events are the festival’s editions',
        waiting: 'which events are the festival’s editions',
    },
}
