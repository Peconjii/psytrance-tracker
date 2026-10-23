import { fetchMapExtras } from '../../api/backend.js';
import { festivalById, festivals, genreById, labels, type Festival } from './types';

// Labels and festivals admins added to the map from the admin panel (the backend's MapExtras), put next to the ones
// in labels.json and festivals.json before the galaxy is drawn or a label / festival page looks one up.

interface AddedLabel { name: string; country?: string; since?: number; genres: string[]; x: number; y: number }

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

