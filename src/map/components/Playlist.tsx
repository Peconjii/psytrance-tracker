import { useState } from 'react';
import type { Track } from '../data/types';
import type { PlaylistApi } from '../hooks/usePlaylist';

/** Heart button used on track rows and in the player */
export function HeartButton({ track, playlist }: { track: Track; playlist: PlaylistApi }) {
  const on = playlist.has(track);
  return (
    <button className={on ? 'heart is-on' : 'heart'} onClick={(e) => { e.stopPropagation(); playlist.toggle(track); }}
      aria-pressed={on} aria-label={on ? `Remove ${track.title} from playlist` : `Save ${track.title} to playlist`}
      title={on ? 'Remove from playlist' : 'Save to playlist'}>{on ? '♥' : '♡'}</button>
  );
}

interface MenuProps {
  playlist: PlaylistApi;
  playing: Track | null;
  onPlay: (t: Track) => void;
}

/** Topbar dropdown: the saved tracks, play all (auto-advances), remove */
export function PlaylistMenu({ playlist, playing, onPlay }: MenuProps) {
  const [open, setOpen] = useState(false);
  const { items } = playlist;
  return (
    <div className="tours playlist">
      <button className="tools__btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        title="Your playlist: tracks you saved with ♡, played one after another. Kept in this browser only.">
        ♥ Playlist · {items.length}
      </button>
      {open && (
        <div className="tours__list playlist__panel">
          <div className="playlist__head">
            <b>Your playlist</b>
            {items.length > 0 && <button className="tourbar__next" onClick={() => onPlay(items[0])}>Play all ▶</button>}
          </div>
          {items.length === 0 ? (
            <p className="playlist__empty">
              Your own mix from the galaxy: tap ♡ next to any track (or in the player) to save it here, then
              "Play all" plays them one after another. Saved in this browser only, no account needed.
            </p>
          ) : (
            <ol>
              {items.map((t) => (
                <li key={t.youtube} className={playing?.youtube === t.youtube ? 'is-playing' : undefined}>
                  <button className="playlist__track" onClick={() => onPlay(t)}>
                    <b>{t.title}</b><small>{t.artist}</small>
                  </button>
                  <button className="playlist__remove" onClick={() => playlist.remove(t)} aria-label={`Remove ${t.title}`}>×</button>
                </li>
              ))}
            </ol>
          )}
          {items.length > 0 && <button className="playlist__clear" onClick={playlist.clear}>Clear playlist</button>}
        </div>
      )}
    </div>
  );
}
