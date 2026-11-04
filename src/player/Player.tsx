import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Track } from '../map/data/types';
import { HeartButton } from '../map/components/Playlist';
import { usePlayer } from './PlayerContext';
import './player.css';

// Minimal typing for the YouTube IFrame Player API (loaded at runtime from youtube.com)
interface YTPlayer {
  loadVideoById: (video: string | { videoId: string; startSeconds?: number }) => void;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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
const PLAYING = 1;

// The quiz plays the part before the drop, which tells the genre far better than the intro: from a little before
// the drop admins wrote down (Admin -> Galaxy), or from somewhere between 30% and 60% of a track without one.
const BEFORE_DROP_SECONDS = 9;
const quizStart = (track: Track) => (track.drop != null ? Math.max(0, track.drop - BEFORE_DROP_SECONDS) : null);

/** The site's mini player: drawn once by the app, so it keeps playing from page to page */
export function Player() {
  const { playing: track, hidden, playlist, hasPrev, hasNext, step, play } = usePlayer();
  const onPrev = () => step(-1);
  const onNext = () => step(1);
  const onEnded = () => step(1);
  const onClose = () => play(null);
  // Its genre on the galaxy, for "back to the star" from any page
  const { genre } = usePlayer();
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const id = track?.youtube;
  // Read when a track loads: a quiz question starts mid-track, everything else from the beginning
  const quizRef = useRef<{ hidden: boolean; track: Track | null }>({ hidden, track });
  quizRef.current = { hidden, track };
  // A quiz track without a written drop jumps to a random point once it plays and its length is known
  const seekOnPlay = useRef(false);

  // One YouTube player for the lifetime of the mini player; new tracks are loaded into it
  useEffect(() => {
    if (!id) return;
    const { hidden: quiz, track: current } = quizRef.current;
    const start = quiz && current ? quizStart(current) : null;
    seekOnPlay.current = quiz && start == null;
    if (playerRef.current) {
      playerRef.current.loadVideoById(start != null ? { videoId: id, startSeconds: start } : id);
      return;
    }
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || !wrapRef.current) return;
      // The API swaps this element for its iframe, so it is created outside React
      const el = document.createElement('div');
      wrapRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, ...(start != null ? { start } : {}) },
        events: {
          onStateChange: (e) => {
            if (e.data === ENDED) onEndedRef.current();
            if (e.data === PLAYING && seekOnPlay.current) {
              seekOnPlay.current = false;
              const length = playerRef.current?.getDuration() ?? 0;
              if (length > 60) playerRef.current?.seekTo(length * (0.3 + Math.random() * 0.3), true);
            }
          },
        },
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
            : (
              <span className="player__now">
                ▶ <b>{track.title}</b> · {track.artist}
                {genre && <Link className="player__star" to={`/?genre=${genre.id}`} title={`Open ${genre.name} on the galaxy`}>✦ {genre.name}</Link>}
              </span>
            )}
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
