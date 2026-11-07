import { describe, expect, it } from 'vitest';
import { buildFleets, withFestivals, type MapEvent } from './events';

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
