import { fetchMapDetails, fetchMapExtras } from '../../api/backend.js';
import { festivalById, festivals, genreById, labels, type Festival } from './types';

// Labels and festivals admins added to the map from the admin panel (the backend's MapExtras), put next to the ones
// in labels.json and festivals.json before the galaxy is drawn or a label / festival page looks one up.

interface AddedLabel { name: string; country?: string; since?: number; genres: string[]; x: number; y: number }
// What someone changed about a label or festival from its edit page (null: as the map file has it)
interface Details { name?: string | null; country?: string | null; since?: number | null; description?: string | null; genres?: string[] | null }
interface Station { kind: 'LABEL' | 'FESTIVAL'; key: string; details: Details }

// The map files' values, kept the first time a station is changed, so an undone change goes back to them
const original = new Map<string, { name?: string; country?: string; since?: number; description?: string; genres: string[] }>();

/** Puts a label's or festival's changed details over what the map files say */
export function applyStationDetails(kind: 'LABEL' | 'FESTIVAL', key: string, d: Details) {
  const id = `${kind}:${key}`;
  if (kind === 'FESTIVAL') {
    const f = festivalById[key];
    if (!f) return;
    if (!original.has(id)) original.set(id, { name: f.name, country: f.country, since: f.since, description: f.description, genres: [...f.genres] });
    const o = original.get(id)!;
    const oldGenres = f.genres;
    f.name = d.name ?? o.name ?? f.name;
    f.country = d.country ?? o.country ?? '';
    f.since = d.since ?? o.since;
    f.description = d.description ?? o.description ?? '';
    f.genres = d.genres ?? o.genres;
    for (const g of oldGenres) { const genre = genreById[g]; if (genre) genre.festivals = genre.festivals.filter((x) => x !== key); }
    for (const g of f.genres) genreById[g]?.festivals.push(key);
  } else {
    const l = labels[key];
    if (!l) return;
    const memberOf = Object.values(genreById).filter((g) => g.labels.includes(key)).map((g) => g.id);
    if (!original.has(id)) original.set(id, { country: l.country, since: l.since, genres: memberOf });
    const o = original.get(id)!;
    l.country = d.country ?? o.country;
    l.since = d.since ?? o.since;
    const genres = d.genres ?? o.genres;
    for (const genre of Object.values(genreById)) {
      const has = genre.labels.includes(key);
      if (has && !genres.includes(genre.id)) genre.labels = genre.labels.filter((x) => x !== key);
      if (!has && genres.includes(genre.id)) genre.labels.push(key);
    }
  }
}

let applied = false;
let loading: Promise<void> | null = null;

export const mapExtrasApplied = () => applied;

// Like the placements: the galaxy never waits longer for a sleeping backend
const WAIT_MS = 4000;

/** Loads the added labels and festivals once and puts them into the map data */
export function loadMapExtras(): Promise<void> {
  if (!loading) {
    loading = fetchMapExtras(AbortSignal.timeout(WAIT_MS))
      .then((extras: { labels: AddedLabel[]; festivals: Festival[] }) => {
        for (const l of extras.labels) {
          if (labels[l.name]) continue;
          // The crew comes from the label's page (LabelCrew); the map only needs the marker
          labels[l.name] = { country: l.country ?? undefined, since: l.since ?? undefined, artists: [], x: l.x, y: l.y };
          for (const id of l.genres) genreById[id]?.labels.push(l.name);
        }
        for (const f of extras.festivals) {
          if (festivalById[f.id]) continue;
          const festival = { ...f, since: f.since ?? undefined, description: f.description ?? '' };
          festivals.push(festival);
          festivalById[f.id] = festival;
          for (const id of f.genres) genreById[id]?.festivals.push(f.id);
        }
      })
      // Then what was changed about any of them (the bundled ones too)
      .then(() => fetchMapDetails(AbortSignal.timeout(WAIT_MS)))
      .then((stations: Station[]) => {
        for (const s of stations) applyStationDetails(s.kind, s.key, s.details);
      })
      .catch((err: unknown) => console.warn('Could not load the labels and festivals added to the map', err))
      .finally(() => { applied = true; });
  }
  return loading;
}

/** After an admin took a label or festival off the map: it leaves the map data at once */
export function forgetMapExtra(kind: 'LABEL' | 'FESTIVAL', key: string) {
  if (kind === 'LABEL') {
    delete labels[key];
    for (const genre of Object.values(genreById)) genre.labels = genre.labels.filter((l) => l !== key);
  } else {
    const at = festivals.findIndex((f) => f.id === key);
    if (at >= 0) festivals.splice(at, 1);
    delete festivalById[key];
    for (const genre of Object.values(genreById)) genre.festivals = genre.festivals.filter((f) => f !== key);
  }
}

/** After an admin added a label or festival: the next galaxy or page visit loads them again (new ones join) */
export function reloadMapExtrasLater() {
  applied = false;
  loading = null;
}

