import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Track } from '../map/data/types';
import { usePlaylist, type PlaylistApi } from '../map/hooks/usePlaylist';

// The music lives in the site's frame, not on one page: start a track on the galaxy, go to the events, and it
// keeps playing. Pages ask for a track through usePlayer(); the mini player (Player.tsx) is drawn once by the app.

export interface PlayerApi {
  playing: Track | null;
  /** The galaxy genre the track was played from, for "back to the star" from any page */
  genre: { id: string; name: string } | null;
  /** Quiz mode: the track plays behind a cover that hides its name */
  hidden: boolean;
  queue: Track[] | null;
  playlist: PlaylistApi;
  /** Plays a track (null stops); with a list, the next one starts when it ends */
  play: (t: Track | null, mystery?: boolean, list?: Track[] | null, genre?: { id: string; name: string } | null) => void;
  step: (dir: 1 | -1) => void;
  hasPrev: boolean;
  hasNext: boolean;
  /** Back from quiz mode: the same track, now with its name */
  reveal: () => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState<Track | null>(null);
  const [hidden, setHidden] = useState(false);
  const [queue, setQueue] = useState<Track[] | null>(null);
  const [genre, setGenre] = useState<{ id: string; name: string } | null>(null);
  const playlist = usePlaylist();

  const index = queue && playing ? queue.findIndex((t) => t.youtube === playing.youtube) : -1;
  const api: PlayerApi = {
    playing, hidden, queue, playlist, genre,
    play: (t, mystery = false, list = null, from = null) => {
      setPlaying(t);
      setGenre(from);
      setHidden(mystery);
      setQueue(list);
    },
    step: (dir) => {
      const next = queue && index >= 0 ? queue[index + dir] : undefined;
      if (next) setPlaying(next);
    },
    hasPrev: index > 0,
    hasNext: !!queue && index >= 0 && index < queue.length - 1,
    reveal: () => setHidden(false),
  };

  // Pages and the galaxy make room for the mini player (site.css, map.css)
  const on = Boolean(playing?.youtube);
  useEffect(() => {
    document.documentElement.classList.toggle('has-player', on);
  }, [on]);

  return <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerApi {
  const api = useContext(PlayerContext);
  if (!api) throw new Error('usePlayer needs the PlayerProvider around the app');
  return api;
}
