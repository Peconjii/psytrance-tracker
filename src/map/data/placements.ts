import { fetchPlacements } from '../../api/backend.js';
import { data } from './types';
import { indexMapArtists } from './events';

// Which artists orbit which star comes from the backend, where admins edit it; genres.json only has the
// placements the map started with, and stays the fallback when the backend can't be reached.

let applied = false;
let loading: Promise<void> | null = null;

export const placementsApplied = () => applied;

// The galaxy waits this long at most: a sleeping free-tier backend takes minutes to wake, and the placements in
// genres.json are close enough for that visit
const WAIT_MS = 4000;

/** Loads the placements once and puts them into the map data before the galaxy is drawn */
export function loadPlacements(): Promise<void> {
  if (!loading) {
    // Aborted after WAIT_MS, so a late answer never changes the data under a galaxy that is already drawn
    loading = fetchPlacements(AbortSignal.timeout(WAIT_MS))
      .then((byGenre: Record<string, string[]>) => {
        for (const genre of data.genres) genre.artists = byGenre[genre.id] ?? [];
        indexMapArtists();
      })
      .catch((err: unknown) => console.warn('Could not load map placements, using the ones in genres.json', err))
      .finally(() => { applied = true; });
  }
  return loading;
}

/** After an admin moved an artist: the next visit to the galaxy loads the placements again */
export function reloadPlacementsLater() {
  applied = false;
  loading = null;
}
