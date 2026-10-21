import { fetchPlacements } from '../../api/backend.js';
import { data } from './types';
import { indexMapArtists } from './events';

// Which artists orbit which star comes from the backend, where admins edit it; genres.json only has the
// placements the map started with, and stays the fallback when the backend can't be reached.

let applied = false;
let loading: Promise<void> | null = null;

export const placementsApplied = () => applied;

/** Loads the placements once and puts them into the map data before the galaxy is drawn */
export function loadPlacements(): Promise<void> {
  if (!loading) {
    loading = fetchPlacements()
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
