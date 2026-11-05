import { useEffect, useRef, useState } from 'react';
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

  // Phones, pages other than the galaxy: scrolling down shrinks the bar to a small bubble in the corner so it stops
  // covering the list; it stays a bubble until a tap on it opens the bar again
  const [mini, setMini] = useState(false);
  useEffect(() => {
    if (!id) { setMini(false); return; }
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const phone = window.matchMedia('(max-width: 700px)').matches;
      const galaxy = document.documentElement.classList.contains('on-galaxy');
      // The galaxy doesn't scroll: there the bar's ▾ button makes the bubble
      if (galaxy) return;
      // Back at the top it stays a bubble: only a tap on it opens the bar again
      if (!phone) setMini(false);
      else if (y > 40 && y - last > 24) setMini(true);
      // Small moves (a finger resting) change nothing
      if (Math.abs(y - last) > 24) last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [id]);
  // Where the bubble sits: dragged with a finger like a chat head, then it snaps to the nearer side edge.
  // Remembered in this browser; without a spot it sits in the bottom right corner (player.css).
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem('player-bubble') ?? 'null'); } catch { return null; }
  });
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const SIZE = 48;
  const MARGIN = 12;
  const keepIn = (x: number, y: number) => ({
    x: Math.min(Math.max(MARGIN, x), window.innerWidth - SIZE - MARGIN),
    y: Math.min(Math.max(MARGIN, y), window.innerHeight - SIZE - MARGIN),
  });
  const onBubbleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const onBubbleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
    d.moved = true;
    setSpot(keepIn(e.clientX - d.dx, e.clientY - d.dy));
  };
  const onBubbleUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) { setMini(false); return; }   // a tap opens the bar
    setSpot((p) => {
      if (!p) return p;
      const snapped = keepIn(p.x + SIZE / 2 < window.innerWidth / 2 ? MARGIN : window.innerWidth, p.y);
      try { localStorage.setItem('player-bubble', JSON.stringify(snapped)); } catch { /* private window */ }
      return snapped;
    });
  };
  const bubbleStyle = mini && spot ? { ...keepIn(spot.x, spot.y) } : null;

  // Opening the ship console or the help panel on a phone shrinks the bar to the bubble so it covers neither
  useEffect(() => {
    const shrink = () => { if (id && window.matchMedia('(max-width: 700px)').matches) setMini(true); };
    window.addEventListener('player:shrink', shrink);
    return () => window.removeEventListener('player:shrink', shrink);
  }, [id]);

  useEffect(() => {
    document.documentElement.classList.toggle('player-mini', mini);
    return () => document.documentElement.classList.remove('player-mini');
  }, [mini]);

  return (
    <section className={['player', hidden && 'is-hidden', mini && 'is-mini', drag.current?.moved && 'is-dragged'].filter(Boolean).join(' ')}
      style={bubbleStyle ? { left: bubbleStyle.x, top: bubbleStyle.y, right: 'auto', bottom: 'auto' } : undefined} aria-label="Player" hidden={!track?.youtube}>
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
          <button className="player__shrink" onClick={() => setMini(true)} aria-label="Shrink the player to a bubble">▾</button>
          <button onClick={onClose} aria-label="Close player">×</button>
        </div>
      )}
      <div className="player__frame">
        <div ref={wrapRef} className="player__mount" />
        {hidden && <div className="player__cover" aria-hidden="true"><span>?</span></div>}
      </div>
      {mini && <button type="button" className="player__bubble" aria-label="Open the player (drag to move it)"
        onPointerDown={onBubbleDown} onPointerMove={onBubbleMove} onPointerUp={onBubbleUp}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMini(false); } }}><span aria-hidden="true">♪</span></button>}
    </section>
  );
}
