# Map of Psy: psy galaxy + event tracker

[![CI](https://github.com/Peconjii/psytrance-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Peconjii/psytrance-tracker/actions/workflows/ci.yml)

A map of psytrance as a galaxy, with the parties that are happening right now sailing through it.
Every genre is a star, artists orbit their genres as satellites, and every upcoming party from
[Goabase](https://www.goabase.net) is a ship that sails to the stars of the genres it plays.

**Live: [psyatlas-one.vercel.app](https://psyatlas-one.vercel.app)**

> Hosted on free tiers (Vercel, Render, Neon). The backend can be asleep, so the first load may take a minute.
> The galaxy itself never waits longer than 4 seconds: without the backend it is drawn from the bundled data.

This repository is the **React frontend**.
**Backend (Java / Spring Boot):** [Peconjii/psytrance-tracker-backend](https://github.com/Peconjii/psytrance-tracker-backend)

## The idea

| On the map | What it is |
|---|---|
| ⭐ **Star** | A genre (goa, full-on, twilight, forest, hi-tech, progressive, psybient...), colored by its scene |
| 🛰️ **Satellite** | An artist, orbiting the genres they play |
| 🚢 **Ship** | An upcoming party, placed between the stars of its genres by their share |
| 🧑‍✈️ **Captain** | The organizer of a party |
| 👥 **Crew** | The line-up; artists who are on the map wear their genre's color |
| ⚓ **Harbour** | Parties whose genre isn't known yet |
| ✈️ **Fleet** | Several parties in the same spot |
| 🚀 **Live fleet** | A festival with set times: one ship per genre, arriving at its star when that genre plays |

How a party gets its genres (worked out by the backend): artists on the map in its line-up first, then
genres named in its stage headers ("DARKPSY / FOREST STAGE"), and only when the line-up says nothing the
genres the organizer ticked on Goabase. Admins can correct it by hand.

## Features

**The galaxy (home page)**
- Stars, satellites and the lines of which genre grew out of which, drawn with **PixiJS** (zoom and pan with
  pixi-viewport). A year slider replays history and lights stars up as their genre appears.
- Ships for the next 7 or 30 days, fleets, the harbour, and a **cockpit** with a radar of the whole galaxy and
  the next departures. Boarding a ship shows its captain and crew orbiting it.
- **Live fleets** from timetables, with "Preview the night" (a whole night in 14 seconds).
- Genre panels with tracks (YouTube player and playlists), labels, festivals, guided tours, a quiz, comparing
  two genres, search, and a **producer cheat sheet** per genre to print (BPM, arrangement, kick/bass, tools,
  reference tracks).
- Artist panels with tracks, labels, festivals and their **next gigs**.
- Shareable links: `/?genre=forest&artist=Derango`, `/?ship=118537`.
- **✎ Fix** on every star, artist, festival and label opens the feedback form about it.

**Events**
- All upcoming parties as tickets grouped by day, with their map genres, weather at the venue (Open-Meteo),
  "I'm going" counts and favorites. Search, country, subgenre and "this weekend" filters, infinite scroll.
- Event page: line-up with a link to every artist, **timetable per stage**, venue, entry, description,
  organizer, map, aftermovie, reviews.
- World map of every party (Leaflet), with star pins in the site's style.
- Artists: everyone in the upcoming line-ups, and each artist's page with their gigs.

**Accounts**
- Register, log in (JWT), reset a forgotten password by email.
- Favorites, "I'm going", reviews, reminder emails before saved events.
- **Follow artists** (☆ Follow): their ships get a spreading halo on the map, and an email arrives when they
  are added to a new line-up. The profile lists who you follow.

**Admin panel** (for the usernames in the backend's `ADMIN_USERNAMES`)
- **Feedback inbox** with statuses, and "Fix in the panel →" straight from a message.
- **Artist genres**: place an artist in genres (the map changes at once, events are worked out again), hide
  words that aren't artists, merge two spellings of one artist.
- **Events**: set an event's genres by hand, correct or write its timetable.
- **History** of every change, with undo.

**Everywhere**
- One look for the whole site, the HUD style of the map (`src/styles/site.css`, `src/map/map.css`).
- **Motion on/off**: a site-wide reduced motion switch that starts from the system setting.
- Works on phones (one menu, folded panels).

## Tech stack

- **React 19** with **Vite**, **React Router 7**
- **TypeScript** for the map (`src/map`), JavaScript for the rest of the site
- **PixiJS 8** + **pixi-viewport** for the galaxy
- **Leaflet** / **React-Leaflet** for the world map
- **Tailwind CSS 4** plus the site's own CSS
- **Axios** for the API
- **Docker** + **nginx** for the production build

## Getting started

**Easiest: Docker.** The [backend repo](https://github.com/Peconjii/psytrance-tracker-backend) has a Docker
Compose file that starts the database, backend and this frontend together. Clone both repos next to each other
and run `docker compose up --build` in the backend folder, then open `http://localhost:5173`.

**For development** with hot reload, run the backend on `http://localhost:8080` (see its README) and start
the dev server here:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`. To see the admin panel locally, start the backend with your username in
`ADMIN_USERNAMES` and register that user.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint (JavaScript) |
| `npm run typecheck` | Type check the map's TypeScript |

### Deployment

The live site is deployed on [Vercel](https://vercel.com) from the `master` branch.
The backend address is set at build time through the `VITE_API_URL` environment variable (without it, the app
calls `http://localhost:8080`), so a change to it needs a redeploy. `vercel.json` sends every path to
`index.html` so React Router can handle it.

## Project structure

```
src/
├── api/          # Axios instance (adds the JWT), all API calls, batched weather lookup
├── components/   # Event tickets and feed, buttons, maps, navbar, admin parts (AdminRoute, AdminParts)
├── context/      # AuthContext (user + token), FavoritesContext, FollowsContext
├── hooks/        # useDebouncedValue, usePageMeta
├── map/          # Map of Psy (TypeScript)
│   ├── MapOfPsy.tsx    # the home page: state, URL, panels
│   ├── galaxy/         # Galaxy.tsx: everything drawn with PixiJS (stars, satellites, ships, fleets)
│   ├── components/     # HUD panels: genre/artist panel, cockpit, fleet panel, player, tours, quiz...
│   └── data/           # genres.json and friends; events.ts (ships, fleets), liveFleet.ts, placements.ts
├── pages/        # Events, EventDetails, GlobalMap, Artists, Artist, Feedback, Admin*, Profile, auth pages
├── styles/       # site.css: the site's HUD style
└── motion.js     # the reduced motion switch
```

### A few details

- **Placements from the backend.** Which artist orbits which star lives in the database, so admins can change
  it. `placements.ts` loads it before the galaxy is drawn, waits at most 4 seconds, and otherwise keeps the
  placements bundled in `genres.json`.
- **Ships.** `events.ts` places each party at the share-weighted middle of its genres' stars, moves it out of a
  star's glow, and groups parties within one grid cell into a fleet. The same fleets feed the cockpit radar.
- **Live fleets.** `liveFleet.ts` turns a timetable into one ship per genre: each leaves the party's ship an
  hour before the first set and docks at its star while its genre plays (a set without an end lasts until the
  next set on its stage).
- **The event list.** `EventFeed` asks for the next page when an invisible sentinel halfway down the list comes
  into view, cancels requests that belong to old filters, and fetches weather for a whole page in one request.

## Data sources

- Events: [Goabase](https://www.goabase.net) (through the backend)
- Genres, artists, labels, festivals: hand-made for Map of Psy, corrected with feedback from the community
- Weather: [Open-Meteo](https://open-meteo.com)
- Maps: [OpenStreetMap](https://www.openstreetmap.org) data, [Esri](https://www.esri.com) dark gray tiles,
  [Nominatim](https://nominatim.org) geocoding
