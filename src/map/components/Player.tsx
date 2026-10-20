import { useEffect, useRef } from 'react';
import type { Track } from '../data/types';
import { HeartButton } from './Playlist';
import type { PlaylistApi } from '../hooks/usePlaylist';

// Minimal typing for the YouTube IFrame Player API (loaded at runtime from youtube.com)
interface YTPlayer {
  loadVideoById: (id: string) => void;
  destroy: () => void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    host?: string;
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: { onStateChange?: (e: { data: number }) => void };
  }) => YTPlayer;
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ENDED = 0;

interface Props {
  track: Track | null;
  /** Quiz mode: keep playing but hide everything that would give the answer away */
  hidden?: boolean;
  playlist: PlaylistApi;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Fired when a video finishes, so a queue can move on */
  onEnded: () => void;
  onClose: () => void;
}

/** Mini player that keeps playing while you move around the map */
export function Player({ track, hidden = false, playlist, hasPrev, hasNext, onPrev, onNext, onEnded, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const id = track?.youtube;

  // One YouTube player for the lifetime of the mini player; new tracks are loaded into it
  useEffect(() => {
    if (!id) return;
    if (playerRef.current) { playerRef.current.loadVideoById(id); return; }
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || !wrapRef.current) return;
      // The API swaps this element for its iframe, so it is created outside React
      const el = document.createElement('div');
      wrapRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: { onStateChange: (e) => { if (e.data === ENDED) onEndedRef.current(); } },
      });
    });
    return () => { cancelled = true; };
  }, [id]);

  // Tear the player down when the mini player closes
  useEffect(() => {
    if (id) return;
    playerRef.current?.destroy();
    playerRef.current = null;
  }, [id]);
  useEffect(() => () => { playerRef.current?.destroy(); playerRef.current = null; }, []);

  return (
    <section className={hidden ? 'player is-hidden' : 'player'} aria-label="Player" hidden={!track?.youtube}>
      {track?.youtube && (
        <div className="player__head">
          {hidden
            ? <span className="player__now">♪ <b>Mystery track</b> · guess the genre</span>
            : <span className="player__now">▶ <b>{track.title}</b> · {track.artist}</span>}
          {!hidden && <HeartButton track={track} playlist={playlist} />}
          {(hasPrev || hasNext) && !hidden && (
            <>
              <button onClick={onPrev} disabled={!hasPrev} aria-label="Previous track">⏮</button>
              <button onClick={onNext} disabled={!hasNext} aria-label="Next track">⏭</button>
            </>
          )}
          {!hidden && (
            <a href={`https://www.youtube.com/watch?v=${track.youtube}`} target="_blank" rel="noopener noreferrer" title="Open on YouTube">↗</a>
          )}
          <button onClick={onClose} aria-label="Close player">×</button>
        </div>
      )}
      <div className="player__frame">
        <div ref={wrapRef} className="player__mount" />
        {hidden && <div className="player__cover" aria-hidden="true"><span>?</span></div>}
      </div>
    </section>
  );
}
