import { useEffect, useRef, useState } from 'react';
import { Application, BlurFilter, Container, Graphics, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { data, festivals, genreById, genresOfArtist, labels, WORLD, type Genre } from '../data/types';
import { shipPosition, type MapEvent } from '../data/events';

interface Props {
  selectedId: string | null;
  artist: string | null;
  year: number;
  onSelect: (id: string) => void;
  onSelectArtist: (genreId: string, name: string) => void;
  /** Active guided tour: the stops in order and how far along we are */
  tourPath: { ids: string[]; index: number } | null;
  /** Highlighted group of systems (festival line-up, label, comparison) and how to connect them */
  focus: Focus | null;
  showStations: boolean;
  onSelectFestival: (id: string) => void;
  showLabels: boolean;
  onSelectLabel: (name: string) => void;
  /** Upcoming events shown as ships between the stars of their genres; null hides the event layer */
  events: MapEvent[] | null;
  /** Events whose panel is open: lines are drawn from their ship to the stars of their genres */
  selectedFleet: number[] | null;
  onSelectFleet: (ids: number[]) => void;
  onSelectHarbour: () => void;
}

export interface Focus {
  ids: string[];
  /** Draw spokes from this point (a festival station) instead of a chain */
  hub?: { x: number; y: number };
  /** Keep the group clear of a card docked at the bottom of the screen (comparison) */
  bottomCard?: boolean;
}

interface Satellite {
  name: string;
  node: Container;
  dot: Graphics;
  radius: number;
  phase: number;
}

interface StarNode {
  genre: Genre;
  root: Container;
  halo: Graphics;
  label: Text;
  /** Artist satellites, in their own layer so the star's hit area doesn't swallow their clicks */
  orbit: Container;
  sats: Satellite[];
  /** Number of upcoming events playing this genre, shown next to the star */
  count: Text;
}

/** Ships parked at the same spot travel together as one fleet */
interface Fleet {
  events: MapEvent[];
  x: number;
  y: number;
  node: Container;
  name: Text | null;
}

const hex = (c: string) => parseInt(c.slice(1), 16);
/** Zoom level from which every star shows its satellites, not just the selected one */
const SAT_ZOOM = 1.6;
const ORBIT_SPEED = 0.05;
/** Zoom level from which ships are drawn; further out, the stars show how many events they have */
const SHIP_ZOOM = 0.7;
/** Ships closer than this to a star are moved out of the star's glow */
const NEAR_STAR = 60;
const SHIP_OFFSET = 78;
/** Ships within one grid cell of each other form a fleet */
const FLEET_GRID = 34;
/** Where events of unknown genre wait: an empty corner south of the chill systems */
const HARBOUR = { x: 420, y: 1720 };

const shortName = (name: string) => (name.length > 26 ? name.slice(0, 25).trimEnd() + '…' : name);

/** A small arrow-shaped ship pointing up */
function drawShip(g: Graphics, x: number, y: number, color: number) {
  g.poly([x - 9, y + 7, x, y - 11, x + 9, y + 7, x, y + 3]).fill(color).stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
}

/** Star map: scenes are nebulae, subgenres are stars, influences are hyperspace routes, artists are satellites. */
export function Galaxy({ selectedId, artist, year, onSelect, onSelectArtist, tourPath, focus, showStations, onSelectFestival, showLabels, onSelectLabel, events, selectedFleet, onSelectFleet, onSelectHarbour }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const starsRef = useRef<Record<string, StarNode>>({});
  const routesRef = useRef<{ a: string; b: string; line: Graphics }[]>([]);
  const artistLinksRef = useRef<Graphics | null>(null);
  const tourLineRef = useRef<Graphics | null>(null);
  const focusLineRef = useRef<Graphics | null>(null);
  const stationLayerRef = useRef<Container | null>(null);
  const labelLayerRef = useRef<Container | null>(null);
  const eventLayerRef = useRef<Container | null>(null);
  const fleetLinesRef = useRef<Graphics | null>(null);
  const harbourRef = useRef<{ node: Container; text: Text } | null>(null);
  const fleetsRef = useRef<Fleet[]>([]);
  const hoverFleetRef = useRef<MapEvent[] | null>(null);
  const selectedFleetRef = useRef(selectedFleet);
  selectedFleetRef.current = selectedFleet;
  const onSelectFleetRef = useRef(onSelectFleet);
  onSelectFleetRef.current = onSelectFleet;
  const onSelectHarbourRef = useRef(onSelectHarbour);
  onSelectHarbourRef.current = onSelectHarbour;
  const onSelectLabelRef = useRef(onSelectLabel);
  onSelectLabelRef.current = onSelectLabel;
  const onSelectFestivalRef = useRef(onSelectFestival);
  onSelectFestivalRef.current = onSelectFestival;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const artistRef = useRef(artist);
  artistRef.current = artist;
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onSelectArtistRef = useRef(onSelectArtist);
  onSelectArtistRef.current = onSelectArtist;

  // Set up the Pixi scene (once)
  useEffect(() => {
    const host = hostRef.current!;
    const app = new Application();
    let destroyed = false;

    (async () => {
      await app.init({ resizeTo: host, background: '#05040d', antialias: true, autoDensity: true, resolution: window.devicePixelRatio });
      if (destroyed) { app.destroy(true); return; }
      host.appendChild(app.canvas);

      const vp = new Viewport({
        screenWidth: host.clientWidth,
        screenHeight: host.clientHeight,
        worldWidth: WORLD.width,
        worldHeight: WORLD.height,
        events: app.renderer.events,
      });
      vp.drag().pinch().wheel().decelerate().clampZoom({ minScale: 0.3, maxScale: 3 });
      // Leave room for the top bar so the northern stars are not hidden under it
      vp.fit(true, WORLD.width * 1.06, WORLD.height * 1.18);
      vp.moveCenter(WORLD.width / 2, WORLD.height * 0.46);
      app.stage.addChild(vp);
      viewportRef.current = vp;
      app.renderer.on('resize', (w: number, h: number) => vp.resize(w, h));

      // Background stars
      const field = new Graphics();
      for (let i = 0; i < 900; i++) {
        field.circle(Math.random() * WORLD.width * 1.4 - 300, Math.random() * WORLD.height * 1.4 - 300, Math.random() * 1.6 + 0.2)
          .fill({ color: 0xffffff, alpha: Math.random() * 0.6 + 0.1 });
      }
      vp.addChild(field);

      // Nebulae: one soft blob around each star, in the scene's color
      const nebula = new Graphics();
      for (const g of data.genres) {
        const c = hex(data.families[g.family].color);
        nebula.circle(g.x, g.y, 220 * g.size).fill({ color: c, alpha: 0.08 });
      }
      nebula.filters = [new BlurFilter({ strength: 60, quality: 4 })];
      vp.addChild(nebula);

      // Routes
      const routeLayer = new Container();
      vp.addChild(routeLayer);
      routesRef.current = data.links.map(([a, b]) => {
        const line = new Graphics();
        routeLayer.addChild(line);
        return { a, b, line };
      });
      const artistLinks = new Graphics();
      routeLayer.addChild(artistLinks);
      artistLinksRef.current = artistLinks;
      const tourLine = new Graphics();
      routeLayer.addChild(tourLine);
      tourLineRef.current = tourLine;
      const focusLine = new Graphics();
      routeLayer.addChild(focusLine);
      focusLineRef.current = focusLine;
      const fleetLines = new Graphics();
      routeLayer.addChild(fleetLines);
      fleetLinesRef.current = fleetLines;

      // Particles travelling along the routes
      const particles = data.links.map(([a, b]) => {
        const p = new Graphics().circle(0, 0, 3).fill(hex(data.families[genreById[b].family].color));
        routeLayer.addChild(p);
        return { a: genreById[a], b: genreById[b], p, t: Math.random() };
      });

      // Stars
      const starLayer = new Container();
      const satLayer = new Container();
      const stationLayer = new Container();
      const labelLayer = new Container();
      const eventLayer = new Container();
      vp.addChild(starLayer, labelLayer, stationLayer, satLayer, eventLayer);
      stationLayerRef.current = stationLayer;
      labelLayerRef.current = labelLayer;
      eventLayerRef.current = eventLayer;

      // The harbour: an anchor where ships of unknown genre wait
      const harbour = new Container();
      harbour.position.set(HARBOUR.x, HARBOUR.y);
      const anchor = new Graphics()
        .circle(0, -8, 4).stroke({ width: 2, color: 0x9a94b8 })
        .moveTo(0, -4).lineTo(0, 12).moveTo(-8, 3).lineTo(8, 3).stroke({ width: 2, color: 0x9a94b8 })
        .arc(0, 4, 11, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2, color: 0x9a94b8 });
      const harbourText = new Text({
        text: '',
        style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fill: 0xcfcaf2, letterSpacing: 1, align: 'center' },
      });
      harbourText.anchor.set(0.5, 0);
      harbourText.position.set(0, 22);
      harbour.addChild(anchor, harbourText);
      harbour.eventMode = 'static';
      harbour.cursor = 'pointer';
      harbour.hitArea = { contains: (x: number, y: number) => (Math.abs(x) < 20 && Math.abs(y) < 22) || (Math.abs(x) < harbourText.width / 2 && y > 18 && y < 22 + harbourText.height) };
      harbour.on('pointertap', () => onSelectHarbourRef.current());
      harbour.visible = false;
      eventLayer.addChild(harbour);
      harbourRef.current = { node: harbour, text: harbourText };

      // Record labels: hexagon markers parked near the systems they release
      const labelTexts: Text[] = [];
      for (const [name, l] of Object.entries(labels)) {
        const node = new Container();
        node.position.set(l.x, l.y);
        const hex6 = (r: number) => Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * r, Math.sin((i * Math.PI) / 3) * r]).flat();
        const icon = new Graphics().poly(hex6(10)).stroke({ width: 2, color: 0xffd36e, alpha: 0.9 }).poly(hex6(4)).fill({ color: 0xffd36e, alpha: 0.9 });
        const text = new Text({
          text: name,
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fill: 0xffd36e, letterSpacing: 1 },
        });
        text.anchor.set(0.5, 0);
        text.position.set(0, 15);
        text.alpha = 0.85;
        node.addChild(icon, text);
        node.eventMode = 'static';
        node.cursor = 'pointer';
        node.hitArea = { contains: (x: number, y: number) => (Math.abs(x) < 16 && Math.abs(y) < 16) || (Math.abs(x) < text.width / 2 && y > 12 && y < 30) };
        node.on('pointertap', () => onSelectLabelRef.current(name));
        labelLayer.addChild(node);
        labelTexts.push(text);
      }

      // Festival stations: small rotating diamonds parked between the systems they host
      const stations: Graphics[] = [];
      const stationTexts: Text[] = [];
      for (const fest of festivals) {
        const node = new Container();
        node.position.set(fest.x, fest.y);
        const icon = new Graphics()
          .rect(-9, -9, 18, 18).stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
          .rect(-4, -4, 8, 8).fill({ color: 0xffffff, alpha: 0.9 });
        icon.rotation = Math.PI / 4;
        const text = new Text({
          text: fest.name,
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fill: 0xffffff, letterSpacing: 1 },
        });
        text.anchor.set(0.5, 0);
        text.position.set(0, 16);
        text.alpha = 0.8;
        node.addChild(icon, text);
        node.eventMode = 'static';
        node.cursor = 'pointer';
        node.hitArea = { contains: (x: number, y: number) => (Math.abs(x) < 18 && Math.abs(y) < 18) || (Math.abs(x) < text.width / 2 && y > 12 && y < 32) };
        node.on('pointertap', () => onSelectFestivalRef.current(fest.id));
        stationLayer.addChild(node);
        stations.push(icon);
        stationTexts.push(text);
      }
      for (const g of data.genres) {
        const color = hex(data.families[g.family].color);
        const root = new Container();
        root.position.set(g.x, g.y);
        const halo = new Graphics().circle(0, 0, 34 * g.size).fill({ color, alpha: 0.35 });
        halo.filters = [new BlurFilter({ strength: 14 })];
        const core = new Graphics().circle(0, 0, 11 * g.size).fill(color).circle(0, 0, 5 * g.size).fill(0xffffff);
        const label = new Text({
          text: g.name.toUpperCase(),
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fill: 0xe9e6ff, letterSpacing: 2 },
        });
        label.anchor.set(0.5, 0);
        label.position.set(0, 30 * g.size);
        const count = new Text({
          text: '',
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: '600', fill: color, letterSpacing: 1 },
        });
        count.anchor.set(0, 1);
        count.position.set(14 * g.size, -12 * g.size);
        count.visible = false;
        root.addChild(halo, core, label, count);
        root.eventMode = 'static';
        root.cursor = 'pointer';
        root.hitArea = { contains: (x: number, y: number) => x * x + y * y < (40 * g.size) ** 2 };
        root.on('pointertap', () => onSelectRef.current(g.id));
        starLayer.addChild(root);

        // Artist satellites on two alternating orbits so neighbouring labels don't collide
        const orbit = new Container();
        orbit.position.set(g.x, g.y);
        orbit.visible = false;
        const inner = 80 * g.size + 20;
        const rings = new Graphics()
          .circle(0, 0, inner).stroke({ width: 1, color, alpha: 0.25 })
          .circle(0, 0, inner + 26).stroke({ width: 1, color, alpha: 0.15 });
        orbit.addChild(rings);
        const sats = g.artists.map((name, i) => {
          const node = new Container();
          const dot = new Graphics().circle(0, 0, 4).fill(0xffffff).circle(0, 0, 7).stroke({ width: 1.5, color, alpha: 0.8 });
          const text = new Text({
            text: name,
            style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: 0xcfcaf2 },
          });
          text.anchor.set(0.5, 0);
          text.position.set(0, 9);
          node.addChild(dot, text);
          node.eventMode = 'static';
          node.cursor = 'pointer';
          node.hitArea = { contains: (x: number, y: number) => (x * x + y * y < 14 * 14) || (Math.abs(x) < text.width / 2 && y > 6 && y < 24) };
          node.on('pointertap', () => onSelectArtistRef.current(g.id, name));
          orbit.addChild(node);
          return { name, node, dot, radius: inner + (i % 2) * 26, phase: (i / g.artists.length) * Math.PI * 2 };
        });
        satLayer.addChild(orbit);
        starsRef.current[g.id] = { genre: g, root, halo, label, orbit, sats, count };
      }

      // Animation: pulse on the beat (one pulse per bar), particles, orbiting satellites
      let time = 0;
      app.ticker.add((tk) => {
        time += tk.deltaMS / 1000;
        for (const icon of stations) icon.rotation = Math.PI / 4 + time * 0.3;
        const stationScale = Math.max(1, 0.9 / vp.scale.x);
        for (const t of stationTexts) t.scale.set(stationScale);
        // Label names appear at mid zoom: hidden in the overview (too crowded) and up close, where artist satellites need the room
        const showLabelNames = vp.scale.x >= 0.75 && vp.scale.x < SAT_ZOOM;
        for (const t of labelTexts) { t.visible = showLabelNames; t.scale.set(stationScale); }
        const zoomed = vp.scale.x >= SAT_ZOOM;
        // Keep star names readable when zoomed far out
        const labelScale = Math.max(1, 0.8 / vp.scale.x);
        for (const s of Object.values(starsRef.current)) {
          const bpm = (s.genre.bpm[0] + s.genre.bpm[1]) / 2;
          const beat = (time * bpm) / 60 / 4;
          s.halo.scale.set(1 + 0.15 * Math.pow(Math.sin(beat * Math.PI), 8));
          s.label.scale.set(labelScale);
          s.count.scale.set(labelScale);

          const selected = s.genre.id === selectedRef.current;
          s.orbit.visible = s.root.visible && (selected || zoomed);
          if (!s.orbit.visible) continue;
          s.orbit.alpha = selected ? 1 : 0.6;
          for (const sat of s.sats) {
            const a = sat.phase + time * ORBIT_SPEED;
            sat.node.position.set(Math.cos(a) * sat.radius, Math.sin(a) * sat.radius);
            sat.dot.scale.set(selected && sat.name === artistRef.current ? 1.6 : 1);
          }
        }
        // Ships appear once you zoom in; a lone ship shows its event's name only up close
        const showShips = vp.scale.x >= SHIP_ZOOM;
        for (const f of fleetsRef.current) {
          f.node.visible = showShips;
          f.node.scale.set(Math.max(1, 0.9 / vp.scale.x));
          if (f.name) f.name.visible = vp.scale.x >= 1.1;
        }
        if (harbourRef.current) harbourRef.current.node.scale.set(stationScale);
        for (const q of particles) {
          q.t = (q.t + tk.deltaMS / 4000) % 1;
          q.p.position.set(q.a.x + (q.b.x - q.a.x) * q.t, q.a.y + (q.b.y - q.a.y) * q.t);
          q.p.visible = starsRef.current[q.a.id].root.visible && starsRef.current[q.b.id].root.visible;
        }
      });
      setReady(true);
    })();

    return () => {
      destroyed = true;
      setReady(false);
      viewportRef.current = null;
      // Destroyed with the app; an effect running before the next init must not touch them
      routesRef.current = [];
      fleetsRef.current = [];
      eventLayerRef.current = null;
      fleetLinesRef.current = null;
      harbourRef.current = null;
      artistLinksRef.current = null;
      tourLineRef.current = null;
      focusLineRef.current = null;
      stationLayerRef.current = null;
      labelLayerRef.current = null;
      starsRef.current = {};
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, []);

  // Selection + year filter: draws routes and dims unrelated stars.
  // With an artist selected, the highlighted systems are the genres that artist appears in.
  useEffect(() => {
    const related = new Set<string>();
    const artistGenres = artist ? genresOfArtist(artist) : [];
    if (focus) {
      focus.ids.forEach((id) => related.add(id));
    } else if (artist) {
      artistGenres.forEach((g) => related.add(g.id));
    } else if (selectedId) {
      related.add(selectedId);
      for (const [a, b] of data.links) {
        if (a === selectedId) related.add(b);
        if (b === selectedId) related.add(a);
      }
    }
    for (const s of Object.values(starsRef.current)) {
      s.root.visible = s.genre.year <= year;
      s.root.alpha = (!selectedId && !focus) || related.has(s.genre.id) ? 1 : 0.3;
    }
    for (const r of routesRef.current) {
      const A = genreById[r.a], B = genreById[r.b];
      const hot = !artist && !focus && (r.a === selectedId || r.b === selectedId);
      r.line.clear();
      if (A.year > year || B.year > year) continue;
      r.line.moveTo(A.x, A.y).lineTo(B.x, B.y)
        .stroke({ width: hot ? 3 : 1.5, color: hex(data.families[B.family].color), alpha: artist || focus ? 0.12 : hot ? 0.9 : 0.3 });
    }

    // Dotted lines from the current system to the artist's other systems
    const links = artistLinksRef.current;
    links?.clear();
    const from = selectedId ? genreById[selectedId] : null;
    if (links && from && artist) {
      for (const to of artistGenres) {
        if (to.id === from.id || to.year > year) continue;
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        for (let d = 0; d < len; d += 14) {
          links.circle(from.x + (dx * d) / len, from.y + (dy * d) / len, 2);
        }
      }
      links.fill({ color: 0xffffff, alpha: 0.7 });
    }

    // Focus lines: spokes from a festival station, or a chain through a label's systems in time order
    const fl = focusLineRef.current;
    fl?.clear();
    if (fl && focus) {
      const gs = focus.ids.map((id) => genreById[id]).filter((g) => g.year <= year);
      if (focus.hub) {
        for (const g of gs) fl.moveTo(focus.hub.x, focus.hub.y).lineTo(g.x, g.y);
      } else {
        const chain = [...gs].sort((a, b) => a.year - b.year);
        chain.forEach((g, i) => (i ? fl.lineTo(g.x, g.y) : fl.moveTo(g.x, g.y)));
      }
      fl.stroke({ width: 3, color: 0xffffff, alpha: 0.75 });
    }
  }, [selectedId, artist, year, ready, focus]);

  useEffect(() => {
    if (stationLayerRef.current) stationLayerRef.current.visible = showStations;
  }, [showStations, ready]);

  useEffect(() => {
    if (labelLayerRef.current) labelLayerRef.current.visible = showLabels;
  }, [showLabels, ready]);

  // Lines from a ship to the stars of its genres, thicker for a bigger share: on hover and for the open fleet
  const drawFleetLines = useRef(() => {});
  drawFleetLines.current = () => {
    const lines = fleetLinesRef.current;
    if (!lines) return;
    lines.clear();
    const shown = new Set<number>([...(selectedFleetRef.current ?? []), ...(hoverFleetRef.current ?? []).map((e) => e.id)]);
    for (const f of fleetsRef.current) {
      for (const e of f.events) {
        if (!shown.has(e.id)) continue;
        for (const g of e.genres) {
          const star = genreById[g.genreId];
          lines.moveTo(f.x, f.y).lineTo(star.x, star.y)
            .stroke({ width: 1 + 3 * g.share, color: hex(data.families[star.family].color), alpha: 0.75 });
        }
      }
    }
  };

  // Event layer: star counts, ships and fleets, and the harbour for unknown genres
  useEffect(() => {
    const layer = eventLayerRef.current;
    const harbour = harbourRef.current;
    if (!layer || !harbour) return;
    for (const f of fleetsRef.current) f.node.destroy({ children: true });
    fleetsRef.current = [];
    hoverFleetRef.current = null;

    const counts: Record<string, number> = {};
    for (const e of events ?? []) for (const g of e.genres) counts[g.genreId] = (counts[g.genreId] ?? 0) + 1;
    for (const s of Object.values(starsRef.current)) {
      const n = counts[s.genre.id] ?? 0;
      s.count.text = n ? `▲${n}` : '';
      s.count.visible = !!events && n > 0;
    }

    // Line-ups the backend hasn't read yet aren't known to be unknown, so they wait outside the map
    const unknown = (events ?? []).filter((e) => e.lineUpRead && !e.genres.length);
    harbour.node.visible = !!events;
    harbour.text.text = `HARBOUR\n${unknown.length} of unknown genre`;

    const groups = new Map<string, { events: MapEvent[]; x: number; y: number }>();
    for (const e of events ?? []) {
      const p = shipPosition(e);
      if (!p) continue;
      // A ship right on a star would hide in its glow: move it out, away from the star
      const top = genreById[e.genres[0].genreId];
      const dx = p.x - top.x, dy = p.y - top.y;
      const d = Math.hypot(dx, dy);
      if (d < NEAR_STAR) {
        const [ux, uy] = d > 1 ? [dx / d, dy / d] : [Math.SQRT1_2, -Math.SQRT1_2];
        p.x = top.x + ux * SHIP_OFFSET;
        p.y = top.y + uy * SHIP_OFFSET;
      }
      const key = `${Math.round(p.x / FLEET_GRID)}:${Math.round(p.y / FLEET_GRID)}`;
      const group = groups.get(key) ?? { events: [], x: p.x, y: p.y };
      group.events.push(e);
      groups.set(key, group);
    }

    for (const { events: fleetEvents, x, y } of groups.values()) {
      const node = new Container();
      node.position.set(x, y);
      // Color of the genre with the biggest share across the fleet
      const weight: Record<string, number> = {};
      for (const e of fleetEvents) for (const g of e.genres) weight[g.genreId] = (weight[g.genreId] ?? 0) + g.share;
      const main = genreById[Object.entries(weight).sort((a, b) => b[1] - a[1])[0][0]];
      const color = hex(data.families[main.family].color);
      const icon = new Graphics();
      let name: Text | null = null;
      if (fleetEvents.length === 1) {
        drawShip(icon, 0, 0, color);
        name = new Text({
          text: shortName(fleetEvents[0].nameParty),
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: 0xe9e6ff },
        });
        name.anchor.set(0.5, 0);
        name.position.set(0, 12);
        node.addChild(icon, name);
      } else {
        drawShip(icon, -9, 4, color);
        drawShip(icon, 9, 4, color);
        drawShip(icon, 0, -6, color);
        const n = new Text({
          text: `×${fleetEvents.length}`,
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: '600', fill: 0xffffff },
        });
        n.anchor.set(0, 0.5);
        n.position.set(20, 0);
        node.addChild(icon, n);
      }
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = { contains: (px: number, py: number) => Math.abs(px) < 26 && Math.abs(py) < 18 };
      node.on('pointerover', () => { hoverFleetRef.current = fleetEvents; drawFleetLines.current(); });
      node.on('pointerout', () => { hoverFleetRef.current = null; drawFleetLines.current(); });
      node.on('pointertap', () => onSelectFleetRef.current(fleetEvents.map((e) => e.id)));
      layer.addChild(node);
      fleetsRef.current.push({ events: fleetEvents, x, y, node, name });
    }
    drawFleetLines.current();
  }, [events, ready]);

  useEffect(() => drawFleetLines.current(), [selectedFleet, ready]);

  // Camera frames the whole focus group
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !focus) return;
    const pts = [...focus.ids.map((id) => genreById[id]), ...(focus.hub ? [focus.hub] : [])];
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Leave room on the right for the HUD
    const card = focus.bottomCard ? 500 : 0;
    const scale = Math.max(0.35, Math.min(1.3, (vp.screenWidth - 420) / (x1 - x0 + 500), (vp.screenHeight - card) / (y1 - y0 + 400)));
    vp.animate({ position: { x: (x0 + x1) / 2 + 180 / scale, y: (y0 + y1) / 2 + card / 2 / scale }, scale, time: 800, ease: 'easeInOutSine' });
  }, [focus, ready]);

  // Tour path: travelled legs solid, the road ahead as faint dots
  useEffect(() => {
    const line = tourLineRef.current;
    if (!line) return;
    line.clear();
    if (!tourPath) return;
    const pts = tourPath.ids.map((id) => genreById[id]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (i <= tourPath.index) {
        line.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color: 0xffffff, alpha: 0.85 });
      } else {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = 0; d < len; d += 18) line.circle(a.x + ((b.x - a.x) * d) / len, a.y + ((b.y - a.y) * d) / len, 2.5);
        line.fill({ color: 0xffffff, alpha: 0.35 });
      }
    }
  }, [tourPath, ready]);

  // Camera flies to the selected system
  useEffect(() => {
    const vp = viewportRef.current;
    if (vp && selectedId) {
      const g = genreById[selectedId];
      vp.animate({ position: { x: g.x, y: g.y }, scale: Math.max(vp.scale.x, 1.3), time: 700, ease: 'easeInOutSine' });
    }
  }, [selectedId, ready]);

  return <div ref={hostRef} className="galaxy" />;
}
