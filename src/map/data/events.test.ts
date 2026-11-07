import { describe, expect, it } from 'vitest';
import { buildFleets, keepApart, withFestivals, type FleetSpot, type MapEvent } from './events';

const event = (id: number, extra: Partial<MapEvent> = {}): MapEvent => ({
  id, nameParty: `Party ${id}`, nameType: 'Club', nameTown: 'Town', nameCountry: 'Serbia',
  dateStart: '2026-12-10', dateEnd: null, lineUpRead: true,
  genres: [{ genreId: 'forest', share: 1, source: 'ARTIST' }],
  featured: false, featuredNote: null, festival: false, festivalId: null, ...extra,
});

describe('withFestivals', () => {
  it('adds the festivals outside the period, marked outside, and keeps the ones inside as they are', () => {
    const week = [event(1), event(2, { festival: true })];
    const festivals = [event(2, { festival: true }), event(3, { festival: true, festivalId: 'jungle' })];
    const ships = withFestivals(week, festivals)!;
    expect(ships.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(ships.find((e) => e.id === 2)!.outside).toBeUndefined();
    expect(ships.find((e) => e.id === 3)!.outside).toBe(true);
  });

  it('shows no ships at all when the console is off', () => {
    expect(withFestivals(null, [event(3, { festival: true })])).toBeNull();
  });
});

describe('buildFleets', () => {
  it('puts parties at the same spot in one fleet, but a festival always sails alone', () => {
    const fleets = buildFleets([event(1), event(2), event(3, { festival: true })]);
    expect(fleets.map((f) => f.events.map((e) => e.id).sort())).toEqual(expect.arrayContaining([[1, 2], [3]]));
    expect(fleets).toHaveLength(2);
  });
});

describe('keepApart', () => {
  const spot = (id: number, x: number, y: number, festival = false): FleetSpot =>
    ({ events: [event(id, { festival })], x, y, mainGenre: 'forest' });
  const dist = (a: FleetSpot, b: FleetSpot) => Math.hypot(a.x - b.x, a.y - b.y);

  it('moves a party off a festival, and the festival barely moves', () => {
    const [fest, party] = keepApart([spot(1, 500, 500, true), spot(2, 505, 500)]);
    expect(dist(fest, party)).toBeGreaterThanOrEqual(47.9);
    expect(Math.hypot(fest.x - 500, fest.y - 500)).toBeLessThan(10);
  });

  it('parts two ships right on top of each other, the same way every time', () => {
    const once = keepApart([spot(1, 300, 300), spot(2, 300, 300)]);
    expect(dist(once[0], once[1])).toBeGreaterThanOrEqual(27.9);
    expect(keepApart([spot(1, 300, 300), spot(2, 300, 300)])).toEqual(once);
  });

  it('leaves ships that already have room where they are', () => {
    const spots = [spot(1, 0, 0, true), spot(2, 200, 0)];
    expect(keepApart(spots).map((s) => [s.x, s.y])).toEqual([[0, 0], [200, 0]]);
  });
});
