import { describe, expect, it } from 'vitest';
import festivals from './festivals.json';
import labels from './labels.json';
import genres from './genres.json';

/** Festival stations and label hexagons keep this much room from each other and from every star */
const MIN_GAP = 80;

type Spot = { name: string; x: number; y: number };
const genreList = (Array.isArray(genres) ? genres : (genres as { genres: Spot[] }).genres) as { id: string; x: number; y: number }[];
const stations: Spot[] = festivals.map((f) => ({ name: `festival ${f.id}`, x: f.x, y: f.y }));
const hexes: Spot[] = Object.entries(labels as Record<string, { x: number; y: number }>).map(([n, l]) => ({ name: `label ${n}`, x: l.x, y: l.y }));
const stars: Spot[] = genreList.map((g) => ({ name: `star ${g.id}`, x: g.x, y: g.y }));

describe('galaxy spacing', () => {
  it('keeps festivals and labels apart from each other and from stars', () => {
    const markers = [...stations, ...hexes];
    const tooClose: string[] = [];
    markers.forEach((a, i) => {
      for (const b of [...markers.slice(i + 1), ...stars]) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < MIN_GAP) tooClose.push(`${a.name} ↔ ${b.name}: ${Math.round(d)}`);
      }
    });
    expect(tooClose).toEqual([]);
  });
});
