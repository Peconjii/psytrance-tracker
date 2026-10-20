import { useEffect, useState } from 'react';
import type { Track } from '../data/types';

const KEY = 'map-of-psy.playlist';

function load(): Track[] {
  try {
    const raw = localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as Track[]) : [];
    return Array.isArray(items) ? items.filter((t) => t && t.youtube && t.title) : [];
  } catch {
    return [];
  }
}

export interface PlaylistApi {
  items: Track[];
  has: (t: Track) => boolean;
  toggle: (t: Track) => void;
  remove: (t: Track) => void;
  clear: () => void;
}

/** Saved tracks, kept in this browser only (localStorage) */
export function usePlaylist(): PlaylistApi {
  const [items, setItems] = useState<Track[]>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage blocked: keep it in memory */ }
  }, [items]);
  const has = (t: Track) => items.some((x) => x.youtube === t.youtube);
  const remove = (t: Track) => setItems((xs) => xs.filter((x) => x.youtube !== t.youtube));
  return {
    items,
    has,
    toggle: (t) => (has(t) ? remove(t) : setItems((xs) => [...xs, { artist: t.artist, title: t.title, year: t.year, youtube: t.youtube }])),
    remove,
    clear: () => setItems([]),
  };
}
