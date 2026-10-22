import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { data, genreById, WORLD } from '../data/types';
import { buildFleets, HARBOUR, type EventPeriod, type MapEvent } from '../data/events';
import type { ViewBounds } from '../galaxy/Galaxy';
import { useFollows } from '../../context/FollowsContext';

interface Props {
  period: EventPeriod | null;
  onPeriod: (period: EventPeriod | null) => void;
  /** Events of the period (null while loading or when the layer is off) */
  events: MapEvent[] | null;
  view: ViewBounds | null;
  /** Fly the camera to a world point */
  onLook: (x: number, y: number) => void;
  onBoard: (eventId: number) => void;
  onHarbour: () => void;
  /** Events of the ship or fleet clicked on the map: they go to the top of the departures */
  picked: number[] | null;
}

const PERIODS: [EventPeriod | null, string][] = [['WEEK', 'Week'], ['MONTH', 'Month'], [null, 'Off']];
const DEPARTURES = 3;

// The radar shows the whole world in a circle of radius R around (C, C)
const SIZE = 104;
const C = SIZE / 2;
const R = SIZE / 2 - 2;
const K = (R * 1.55) / Math.max(WORLD.width, WORLD.height);
const toRadar = (x: number, y: number) => ({ x: C + (x - WORLD.width / 2) * K, y: C + (y - WORLD.height / 2) * K });

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// "TONIGHT" for today's parties (and ones that already started), else "THU 22"
function departureLabel(dateStart: string | null): string {
  if (!dateStart) return 'TBA';
  const [y, m, d] = dateStart.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  if (day <= startOfToday()) return 'TONIGHT';
  return `${day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} ${d}`;
}

/** The ship's console, bottom left: radar, event period, counts and the next departures to board */
export function Cockpit({ period, onPeriod, events, view, onLook, onBoard, onHarbour, picked }: Props) {
  // Phones start with the console folded, so it doesn't cover the map
  const [open, setOpen] = useState(() => !window.matchMedia('(max-width: 700px)').matches);
  const { gigsByEvent } = useFollows();
  const fleets = useMemo(() => buildFleets(events ?? []), [events]);
  const shipCount = fleets.reduce((n, f) => n + f.events.length, 0);
  const inHarbour = (events ?? []).filter((e) => e.lineUpRead && !e.genres.length).length;
  // The clicked ship (or the ships of a clicked fleet) first, then the soonest of the rest
  const ships = (events ?? []).filter((e) => e.genres.length);
  const pickedShips = picked ? ships.filter((e) => picked.includes(e.id)) : [];
  const departures = [...pickedShips, ...ships.filter((e) => !pickedShips.includes(e))].slice(0, Math.max(DEPARTURES, pickedShips.length));
  const boardedId = picked?.length === 1 ? picked[0] : null;

  // A ship clicked on the map opens the console, so its departure is in view
  const pickedKey = picked?.join(',') ?? '';
  useEffect(() => {
    if (pickedKey) setOpen(true);
  }, [pickedKey]);

  // Click on the radar: fly the camera to that point of the world
  const look = (ev: MouseEvent<SVGSVGElement>) => {
    const box = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - box.left) / box.width) * SIZE;
    const py = ((ev.clientY - box.top) / box.height) * SIZE;
    onLook(WORLD.width / 2 + (px - C) / K, WORLD.height / 2 + (py - C) / K);
  };

  const frame = view && (() => {
    const a = toRadar(view.x0, view.y0), b = toRadar(view.x1, view.y1);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  })();
  const harbour = toRadar(HARBOUR.x, HARBOUR.y);

  return (
    <section className={open ? 'cockpit' : 'cockpit is-folded'} aria-label="Ship navigation: upcoming events">
      <button className="cockpit__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="cockpit__tag">// SHIP NAVIGATION · EVENTS</span>
        {!open && period && events && <span className="cockpit__mini">▲ {shipCount} · ⚓ {inHarbour}</span>}
        <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <>
          <div className="cockpit__top">
            <svg className="cockpit__radar" viewBox={`0 0 ${SIZE} ${SIZE}`} onClick={look} role="img"
              aria-label="Radar of the galaxy: click to fly the camera there">
              <circle cx={C} cy={C} r={R} className="radar__ring" />
              <circle cx={C} cy={C} r={R * 0.64} className="radar__ring" />
              <circle cx={C} cy={C} r={R * 0.3} className="radar__ring" />
              <line x1={C} y1={C - R} x2={C} y2={C + R} className="radar__ring" />
              <line x1={C - R} y1={C} x2={C + R} y2={C} className="radar__ring" />
              <path className="radar__sweep" d={`M${C} ${C} L${C} ${C - R} A${R} ${R} 0 0 1 ${C + R * 0.7} ${C - R * 0.71} Z`} />
              {data.genres.map((g) => {
                const p = toRadar(g.x, g.y);
                return <circle key={g.id} cx={p.x} cy={p.y} r={0.9} className="radar__star" />;
              })}
              {fleets.map((f) => {
                const p = toRadar(f.x, f.y);
                return <circle key={`${f.x}:${f.y}`} cx={p.x} cy={p.y} r={f.events.length > 1 ? 2.6 : 1.9}
                  fill={data.families[genreById[f.mainGenre].family].color} />;
              })}
              {period && inHarbour > 0 && <circle cx={harbour.x} cy={harbour.y} r={1.9} className="radar__harbour" />}
              {frame && <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} className="radar__view" />}
            </svg>

            <div className="cockpit__controls">
              <div className="cockpit__periods" role="group" aria-label="How far ahead">
                {PERIODS.map(([p, label]) => (
                  <button key={label} className={period === p ? 'is-on' : ''} aria-pressed={period === p}
                    onClick={() => onPeriod(p)}>{label}</button>
                ))}
              </div>
              {period && events ? (
                <p className="cockpit__counts">
                  <b>▲ {shipCount}</b> ships · <b>{fleets.filter((f) => f.events.length > 1).length}</b> fleets<br />
                  <button className="cockpit__harbour" onClick={onHarbour}><b>⚓ {inHarbour}</b> in harbour</button>
                </p>
              ) : (
                <p className="cockpit__counts">{period ? 'Scanning…' : 'Events off'}</p>
              )}
            </div>
          </div>

          {departures.length > 0 && (
            <>
              <div className="cockpit__label">Next departures</div>
              <ul className="cockpit__departures">
                {departures.map((e) => {
                  const genre = genreById[e.genres[0].genreId];
                  const label = departureLabel(e.dateStart);
                  // Artists the user follows (or whose label they follow) who play this one
                  const followed: string[] | undefined = gigsByEvent.get(e.id);
                  return (
                    <li key={e.id} className={pickedShips.includes(e) ? 'is-picked' : undefined}>
                      <span className={label === 'TONIGHT' ? 'cockpit__when is-now' : 'cockpit__when'}>{label}</span>
                      <span className="cockpit__event">
                        <b title={followed ? `${e.nameParty} · you follow ${followed.join(', ')}` : e.nameParty}>
                          {followed && <span className="cockpit__star" aria-label="You follow someone who plays here">★ </span>}
                          {e.nameParty}
                        </b>
                        <span>{e.nameTown} · <i style={{ color: data.families[genre.family].color }}>{genre.name}</i></span>
                      </span>
                      {e.id === boardedId
                        ? <span className="cockpit__board is-aboard">Aboard ✓</span>
                        : <button className="cockpit__board" onClick={() => onBoard(e.id)}>Board ▸</button>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
