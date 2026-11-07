import { fetchGalaxyContent } from '../../api/backend.js';
import { data, type Track } from './types';
import { loadAddedGenres } from './addedGenres';

// Each genre's texts and key tracks come from the backend, where admins and editors fix them (Admin -> Galaxy);
// genres.json has what the map started with, and stays the fallback when the backend can't be reached.

interface Content {
  description: string;
  bass: string | null;
  kick: string | null;
  atmosphere: string | null;
  year: number | null;
  bpmMin: number | null;
  bpmMax: number | null;
  verified: boolean;
  tracks: Track[];
}

let applied = false;
let loading: Promise<void> | null = null;

export const contentApplied = () => applied;

// The same wait as the placements (see placements.ts): a sleeping backend must not keep the galaxy dark
const WAIT_MS = 4000;

/** Loads the content once and puts it into the map data before the galaxy is drawn */
export function loadContent(): Promise<void> {
  if (!loading) {
    // The added genres go into the map data first, so their texts land on them too
    loading = Promise.all([fetchGalaxyContent(AbortSignal.timeout(WAIT_MS)), loadAddedGenres()])
      .then(([byGenre]: [Record<string, Content>, void]) => {
        for (const genre of data.genres) {
          const c = byGenre[genre.id];
          if (!c) continue;
          genre.description = c.description;
          genre.production = { bass: c.bass ?? '', kick: c.kick ?? '', atmosphere: c.atmosphere ?? '' };
          if (c.year != null) genre.year = c.year;
          if (c.bpmMin != null && c.bpmMax != null) genre.bpm = [c.bpmMin, c.bpmMax];
          genre.verified = c.verified;
          genre.tracks = c.tracks.map((t) => ({ ...t, year: t.year ?? undefined, drop: t.drop ?? undefined }));
        }
      })
      .catch((err: unknown) => console.warn('Could not load the galaxy texts and tracks, using the ones in genres.json', err))
      .finally(() => { applied = true; });
  }
  return loading;
}

/** After an edit in Admin -> Galaxy: the next visit to the galaxy loads the content again */
export function reloadContentLater() {
  applied = false;
  loading = null;
}
