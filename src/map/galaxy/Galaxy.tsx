import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Application, BlurFilter, Container, Graphics, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { data, festivals, genreById, genresOfArtist, labels, WORLD, type Genre } from '../data/types';
import { artistSlug, buildFleets, HARBOUR, type MapEvent } from '../data/events';
import { shipState, type LiveFleet } from '../data/liveFleet';

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
  /** Line-up of the boarded ship (one event selected): drawn as satellites orbiting it */
  crew: CrewMember[] | null;
  onSelectCrew: (member: CrewMember) => void;
  /** Reports the part of the world on screen whenever the camera moves (for the cockpit radar) */
  onView?: (view: ViewBounds) => void;
  /** Filled with a function that flies the camera to a world point (the radar uses it) */
  cameraRef?: MutableRefObject<((x: number, y: number) => void) | null>;
  /** Site-wide "reduced motion": everything stands still and the camera jumps instead of flying */
  reducedMotion?: boolean;
  /** Events with a timetable over several genres: one ship per genre, sailing to its star when the genre plays */
  liveFleets?: LiveFleet[];
  /** What time it is on the map, in ms since 1970: the real time, or the time of a fleet preview */
  clockRef?: MutableRefObject<() => number>;
  /** A fleet whose night is being previewed: the camera frames its ship and the stars its genre ships sail to */
  framedFleet?: LiveFleet | null;
  /** Events where artists the user follows play (event id -> their names): those ships are gold */
  followedEvents?: ReadonlyMap<number, string[]>;
  /** Slugs of the artists the user follows: they get a place on their stars' orbits first */
  followedArtists?: ReadonlySet<string>;
}

/** The visible part of the world, in world coordinates */
export interface ViewBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** An artist in a ship's line-up; color is their genre's scene color when they are on the map */
export interface CrewMember {
  name: string;
  slug: string | null;
  color: string | null;
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
  /** "+8 more" under the orbit when not every artist fits on it */
  more: Text;
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
  /** The ship arrows, turned towards the star of the fleet's main genre */
  body: Container;
  /** Engine exhaust in the main genre's color, redrawn every frame */
  trail: Graphics;
  color: number;
  /** Engine nozzles in body coordinates */
  engines: { x: number; y: number }[];
  particles: { x: number; y: number; vx: number; vy: number; age: number }[];
  spawn: number;
  phase: number;
  /** Rings around a ship with an artist the user follows, redrawn every frame */
  halo: Graphics | null;
}

const hex = (c: string) => parseInt(c.slice(1), 16);
/** At most this many artists orbit a star, so a busy genre stays readable; the genre's panel lists them all */
const MAX_SATELLITES = 12;

/**
 * Which artists get a place on a star's orbit: the selected artist, then the ones the user follows, then the rest in
 * the map's order (its key artists come first). The others are listed in the genre's panel.
 */
function pickSatellites(names: string[], selectedArtist: string | null, followed: ReadonlySet<string> | undefined): Set<string> {
  const first = names.filter((n) => n === selectedArtist);
  const liked = names.filter((n) => n !== selectedArtist && followed?.has(artistSlug(n)));
  const rest = names.filter((n) => n !== selectedArtist && !followed?.has(artistSlug(n)));
  return new Set([...first, ...liked, ...rest].slice(0, MAX_SATELLITES));
}

/** Puts the picked satellites evenly on the two orbits and hides the others */
function layoutSatellites(star: StarNode, shown: Set<string>) {
  const visible = star.sats.filter((sat) => shown.has(sat.name));
  const inner = star.sats[0]?.radius !== undefined ? Math.min(...star.sats.map((sat) => sat.radius)) : 0;
  star.sats.forEach((sat) => { sat.node.visible = shown.has(sat.name); });
  visible.forEach((sat, i) => {
    sat.radius = inner + (i % 2) * 26;
    sat.phase = (i / visible.length) * Math.PI * 2;
  });
  const hidden = star.sats.length - visible.length;
  star.more.text = hidden > 0 ? `+${hidden} more · open the system` : '';
}

/** Zoom level from which every star shows its satellites, not just the selected one */
const SAT_ZOOM = 1.6;
/** Festival names appear from this zoom; in the full overview they crowd the centre of the map */
const STATION_NAME_ZOOM = 0.5;
const ORBIT_SPEED = 0.05;
/** Zoom level from which ships are drawn; further out, the stars show how many events they have */
const SHIP_ZOOM = 0.7;
/** How long one ring of a followed ship's halo takes to spread out and fade, in seconds */
const HALO_PERIOD = 2.2;

/**
 * The halo of a ship with an artist the user follows: two rings in the ship's color keep spreading out from it,
 * like a sonar ping, around a fixed white ring. `t` (0..1) is how far the first ring has spread.
 */
function drawHalo(g: Graphics, color: number, t: number | null) {
  g.clear();
  g.circle(0, 0, 15).stroke({ width: 1.2, color: 0xffffff, alpha: 0.55 });
  // Reduced motion: one still ring a little further out
  if (t === null) {
    g.circle(0, 0, 24).stroke({ width: 1.5, color, alpha: 0.5 });
    return;
  }
  for (const p of [t, (t + 0.5) % 1]) {
    g.circle(0, 0, 15 + p * 24).stroke({ width: 1.5, color, alpha: 0.75 * (1 - p) });
  }
}

const shortName = (name: string) => (name.length > 26 ? name.slice(0, 25).trimEnd() + '…' : name);

/** The mark of a featured ship: a still diamond in the site's accent color around it */
function drawFeatured(g: Graphics) {
  g.poly([0, -21, 21, 0, 0, 21, -21, 0]).stroke({ width: 1.5, color: 0x3ee6c4, alpha: 0.9 });
}

/** A small arrow-shaped ship pointing right, in the color of its main genre */
function drawShip(g: Graphics, x: number, y: number, color: number) {
  g.poly([x - 7, y - 9, x + 11, y, x - 7, y + 9, x - 3, y]).fill(color).stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
}

const TRAIL_LIFE = 0.8;
const TRAIL_EVERY = 0.05;

/** Star map: scenes are nebulae, subgenres are stars, influences are hyperspace routes, artists are satellites. */
export function Galaxy({ selectedId, artist, year, onSelect, onSelectArtist, tourPath, focus, showStations, onSelectFestival, showLabels, onSelectLabel, events, selectedFleet, onSelectFleet, onSelectHarbour, crew, onSelectCrew, onView, cameraRef, reducedMotion = false, liveFleets = [], clockRef, framedFleet = null, followedEvents, followedArtists }: Props) {
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
  // Genre ships of the live fleets, moved every frame by the map clock
  const liveShipsRef = useRef<{ fleet: LiveFleet; ship: LiveFleet['ships'][number]; node: Container; body: Graphics; label: Text }[]>([]);
  const liveLayerRef = useRef<Container | null>(null);
  const clockRefRef = useRef(clockRef);
  clockRefRef.current = clockRef;
  const hoverFleetRef = useRef<MapEvent[] | null>(null);
  const selectedFleetRef = useRef(selectedFleet);
  selectedFleetRef.current = selectedFleet;
  const onSelectFleetRef = useRef(onSelectFleet);
  onSelectFleetRef.current = onSelectFleet;
  const onSelectHarbourRef = useRef(onSelectHarbour);
  onSelectHarbourRef.current = onSelectHarbour;
  const onSelectCrewRef = useRef(onSelectCrew);
  onSelectCrewRef.current = onSelectCrew;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  // Camera moves take this long, or no time at all with reduced motion
  const flight = (ms: number) => (reducedMotionRef.current ? 1 : ms);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const cameraRefRef = useRef(cameraRef);
  cameraRefRef.current = cameraRef;
  const crewRef = useRef<{ orbit: Container; sats: { node: Container; radius: number; phase: number }[] } | null>(null);
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
      vp.drag().pinch().wheel().decelerate().clampZoom({ minScale: 0.23, maxScale: 3 });
      // Leave room for the top bar so the northern stars are not hidden under it
      vp.fit(true, WORLD.width * 1.06, WORLD.height * 1.18);
      vp.moveCenter(WORLD.width / 2, WORLD.height * 0.46);
      app.stage.addChild(vp);
      viewportRef.current = vp;
      // Tell the radar what is on screen: at most once per frame while the camera moves
      let viewPending = false;
      const reportView = () => {
        if (viewPending) return;
        viewPending = true;
        requestAnimationFrame(() => {
          viewPending = false;
          if (destroyed) return;
          const b = vp.getVisibleBounds();
          onViewRef.current?.({ x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height });
        });
      };
      vp.on('moved', reportView);
      app.renderer.on('resize', (w: number, h: number) => { vp.resize(w, h); reportView(); });
      reportView();
      if (cameraRefRef.current) {
        cameraRefRef.current.current = (x: number, y: number) =>
          vp.animate({ position: { x, y }, time: flight(600), ease: 'easeInOutSine' });
      }

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
      const liveLayer = new Container();
      eventLayer.addChild(liveLayer);
      liveLayerRef.current = liveLayer;
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
        // Under the orbit: how many artists of the genre don't fit on it
        const more = new Text({
          text: '',
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: color, letterSpacing: 1 },
        });
        more.anchor.set(0.5, 0);
        more.position.set(0, inner + 46);
        orbit.addChild(more);
        satLayer.addChild(orbit);
        starsRef.current[g.id] = { genre: g, root, halo, label, orbit, sats, more, count };
        layoutSatellites(starsRef.current[g.id], pickSatellites(g.artists, null, undefined));
      }

      // Animation: pulse on the beat (one pulse per bar), particles, orbiting satellites
      let time = 0;
      // Festival and label names hidden because another one already stands there, at the zoom they were worked out for
      const crowded = new Set<Text>();
      let crowdedAt = -1;
      app.ticker.add((tk) => {
        // With reduced motion the clock stops, so pulses, orbits, rotations and bobbing all hold still
        const still = reducedMotionRef.current;
        if (!still) time += tk.deltaMS / 1000;
        for (const icon of stations) icon.rotation = Math.PI / 4 + time * 0.3;
        const stationScale = Math.max(1, 0.9 / vp.scale.x);
        const showStationNames = vp.scale.x >= STATION_NAME_ZOOM;
        for (const t of stationTexts) t.scale.set(stationScale);
        for (const t of labelTexts) t.scale.set(stationScale);
        // Names that would cover each other: festivals first, then labels in their order; the rest wait for a closer
        // zoom. Worked out only when the zoom changes (moving the map doesn't change what overlaps)
        if (vp.scale.x !== crowdedAt) {
          crowdedAt = vp.scale.x;
          crowded.clear();
          const kept: { x0: number; y0: number; x1: number; y1: number }[] = [];
          for (const t of [...stationTexts, ...labelTexts]) {
            const at = t.parent!.position;
            const box = { x0: at.x - t.width / 2, y0: at.y + t.y * t.scale.y, x1: at.x + t.width / 2, y1: at.y + t.y * t.scale.y + t.height };
            if (kept.some((k) => box.x0 < k.x1 && box.x1 > k.x0 && box.y0 < k.y1 && box.y1 > k.y0)) crowded.add(t);
            else kept.push(box);
          }
        }
        for (const t of stationTexts) t.visible = showStationNames && !crowded.has(t);
        // Label names appear at mid zoom: hidden in the overview (too crowded) and up close, where artist satellites need the room
        const showLabelNames = vp.scale.x >= 0.75 && vp.scale.x < SAT_ZOOM;
        for (const t of labelTexts) t.visible = showLabelNames && !crowded.has(t);
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
        const dt = still ? 0 : tk.deltaMS / 1000;
        for (const f of fleetsRef.current) {
          f.node.visible = showShips;
          f.node.scale.set(Math.max(1, 0.9 / vp.scale.x));
          if (f.name) f.name.visible = vp.scale.x >= 1.1;
          if (!showShips) continue;
          // Ships float gently, each on its own beat
          f.body.y = Math.sin(time * 1.6 + f.phase) * 2.5;
          if (f.halo) drawHalo(f.halo, f.color, still ? null : ((time / HALO_PERIOD) + f.phase) % 1);
          if (still) {
            f.particles = [];
            f.trail.clear();
            continue;
          }
          // Engine exhaust: particles leave the nozzles backwards, drift and fade
          const cos = Math.cos(f.body.rotation), sin = Math.sin(f.body.rotation);
          f.spawn += dt;
          while (f.spawn > TRAIL_EVERY) {
            f.spawn -= TRAIL_EVERY;
            for (const e of f.engines) {
              const ly = e.y * f.body.scale.y;
              const spread = (Math.random() - 0.5) * 16;
              f.particles.push({
                x: e.x * cos - ly * sin,
                y: e.x * sin + ly * cos + f.body.y,
                vx: -cos * 40 - sin * spread,
                vy: -sin * 40 + cos * spread,
                age: 0,
              });
            }
          }
          f.trail.clear();
          f.particles = f.particles.filter((p) => (p.age += dt / TRAIL_LIFE) < 1);
          for (const p of f.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            f.trail.circle(p.x, p.y, 3.4 * (1 - p.age) + 0.6).fill({ color: f.color, alpha: 0.75 * (1 - p.age) });
          }
        }
        // The boarded ship's crew orbits it like artists orbit a star
        if (crewRef.current) {
          crewRef.current.orbit.scale.set(Math.max(1, 0.9 / vp.scale.x));
          for (const sat of crewRef.current.sats) {
            const a = sat.phase + time * ORBIT_SPEED * 1.5;
            sat.node.position.set(Math.cos(a) * sat.radius, Math.sin(a) * sat.radius);
          }
        }
        // Live fleets: each genre ship sails from the event's ship to its star and docks while its genre plays
        const now = clockRefRef.current?.current() ?? Date.now();
        for (const live of liveShipsRef.current) {
          const state = shipState(live.fleet, live.ship, now);
          live.node.visible = showShips && state.visible;
          if (!live.node.visible) continue;
          live.node.position.set(state.x, state.y);
          live.node.scale.set(Math.max(1, 0.9 / vp.scale.x));
          live.node.alpha = state.phase === 'done' ? 0.35 : 1;
          if (state.phase === 'sailing') live.body.rotation = Math.atan2(live.ship.y - live.fleet.port.y, live.ship.x - live.fleet.port.x);
          live.label.text = state.phase === 'playing' ? `▸ ${genreById[live.ship.genreId].name}` : genreById[live.ship.genreId].name;
        }
        if (harbourRef.current) harbourRef.current.node.scale.set(stationScale);
        for (const q of particles) {
          q.t = (q.t + dt / 4) % 1;
          q.p.position.set(q.a.x + (q.b.x - q.a.x) * q.t, q.a.y + (q.b.y - q.a.y) * q.t);
          q.p.visible = !still && starsRef.current[q.a.id].root.visible && starsRef.current[q.b.id].root.visible;
        }
      });
      setReady(true);
    })();

    return () => {
      destroyed = true;
      setReady(false);
      if (cameraRefRef.current) cameraRefRef.current.current = null;
      viewportRef.current = null;
      // Destroyed with the app; an effect running before the next init must not touch them
      routesRef.current = [];
      fleetsRef.current = [];
      liveShipsRef.current = [];
      liveLayerRef.current = null;
      crewRef.current = null;
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

  // The artists on each orbit: the selected one and the ones the user follows get a place first
  useEffect(() => {
    if (!ready) return;
    for (const s of Object.values(starsRef.current)) {
      layoutSatellites(s, pickSatellites(s.genre.artists, s.genre.id === selectedId ? artist : null, followedArtists));
    }
  }, [selectedId, artist, followedArtists, ready]);

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

    for (const { events: fleetEvents, x, y, mainGenre } of buildFleets(events ?? [])) {
      const node = new Container();
      node.position.set(x, y);
      const main = genreById[mainGenre];
      const color = hex(data.families[main.family].color);
      // A ship with an artist the user follows gets a halo (animated in the ticker)
      const followed = fleetEvents.some((e) => followedEvents?.has(e.id));
      const halo = followed ? new Graphics() : null;
      if (halo) {
        drawHalo(halo, color, null);
        node.addChild(halo);
      }
      // A ship an admin features gets a diamond around it
      const featured = fleetEvents.some((e) => e.featured);
      if (featured) {
        const mark = new Graphics();
        drawFeatured(mark);
        node.addChild(mark);
      }

      // The ships point at the star of the main genre: they sail towards their sound.
      // Facing left they are mirrored, so the cockpit stays on top.
      const trail = new Graphics();
      const body = new Container();
      const heading = Math.atan2(main.y - y, main.x - x);
      body.rotation = heading;
      if (Math.cos(heading) < 0) body.scale.y = -1;
      const engines: { x: number; y: number }[] = [];
      const arrows = new Graphics();
      body.addChild(arrows);
      const addShip = (dx: number, dy: number) => {
        drawShip(arrows, dx, dy, color);
        // The notch at the back of the arrow is the engine
        engines.push({ x: dx - 4, y: dy });
      };

      let name: Text | null = null;
      if (fleetEvents.length === 1) {
        addShip(0, 0);
        name = new Text({
          text: (featured ? '◆ ' : '') + (followed ? '★ ' : '') + shortName(fleetEvents[0].nameParty),
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: 0xe9e6ff },
        });
        name.anchor.set(0.5, 0);
        name.position.set(0, 14);
        node.addChild(trail, body, name);
      } else {
        // A small formation: the leader ahead, two wingmen behind
        addShip(6, 0);
        addShip(-8, -10);
        addShip(-8, 10);
        const n = new Text({
          text: `×${fleetEvents.length}`,
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: '600', fill: 0xffffff },
        });
        n.anchor.set(0.5, 0);
        n.position.set(0, 16);
        node.addChild(trail, body, n);
      }
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = { contains: (px: number, py: number) => px * px + py * py < 26 * 26 };
      node.on('pointerover', () => { hoverFleetRef.current = fleetEvents; drawFleetLines.current(); });
      node.on('pointerout', () => { hoverFleetRef.current = null; drawFleetLines.current(); });
      node.on('pointertap', () => onSelectFleetRef.current(fleetEvents.map((e) => e.id)));
      layer.addChild(node);
      fleetsRef.current.push({
        events: fleetEvents, x, y, node, name, body, trail, color, engines,
        particles: [], spawn: 0, phase: Math.random() * Math.PI * 2, halo,
      });
    }
    drawFleetLines.current();
  }, [events, ready, followedEvents]);

  useEffect(() => drawFleetLines.current(), [selectedFleet, ready]);

  // Previewing a night: frame the event's ship and its genre ships' stars, close enough for ships to show
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !framedFleet) return;
    const pts = [framedFleet.port, ...framedFleet.ships];
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Room on the right for the HUD
    const scale = Math.max(SHIP_ZOOM + 0.05, Math.min(1.4, (vp.screenWidth - 440) / (x1 - x0 + 300), vp.screenHeight / (y1 - y0 + 300)));
    vp.animate({ position: { x: (x0 + x1) / 2 + 200 / scale, y: (y0 + y1) / 2 }, scale, time: flight(800), ease: 'easeInOutSine' });
  }, [framedFleet, ready]);

  // The ships of the live fleets, one per genre; the ticker moves them
  useEffect(() => {
    const layer = liveLayerRef.current;
    if (!layer) return;
    for (const live of liveShipsRef.current) live.node.destroy({ children: true });
    liveShipsRef.current = [];
    for (const fleet of liveFleets) {
      for (const ship of fleet.ships) {
        const star = genreById[ship.genreId];
        const color = hex(data.families[star.family].color);
        const node = new Container();
        // A ring around the ship sets the fleet apart from the event ships parked near the same star
        const ring = new Graphics().circle(0, 0, 15).fill({ color, alpha: 0.18 }).stroke({ width: 1.5, color, alpha: 0.9 });
        const body = new Graphics();
        drawShip(body, 0, 0, color);
        body.scale.set(0.8);
        const label = new Text({
          text: star.name,
          style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: color },
        });
        label.anchor.set(0.5, 0);
        label.position.set(0, 17);
        node.addChild(ring, body, label);
        node.visible = false;
        node.eventMode = 'static';
        node.cursor = 'pointer';
        node.hitArea = { contains: (px: number, py: number) => px * px + py * py < 18 * 18 };
        node.on('pointertap', () => onSelectFleetRef.current([fleet.eventId]));
        layer.addChild(node);
        liveShipsRef.current.push({ fleet, ship, node, body, label });
      }
    }
  }, [liveFleets, ready]);

  // Camera flies to the opened ship or fleet, leaving room on the right for the HUD
  useEffect(() => {
    const vp = viewportRef.current;
    const fleet = selectedFleet && fleetsRef.current.find((f) => f.events.some((e) => e.id === selectedFleet[0]));
    if (!vp || !fleet) return;
    const scale = Math.max(vp.scale.x, 1.3);
    vp.animate({ position: { x: fleet.x + 180 / scale, y: fleet.y }, scale, time: flight(700), ease: 'easeInOutSine' });
  }, [selectedFleet, events, ready]);

  // Crew of the boarded ship: its line-up as satellites on alternating orbits around it
  useEffect(() => {
    const layer = eventLayerRef.current;
    crewRef.current?.orbit.destroy({ children: true });
    crewRef.current = null;
    const fleet = selectedFleet && fleetsRef.current.find((f) => f.events.some((e) => e.id === selectedFleet[0]));
    if (!layer || !fleet || !crew?.length) return;
    const orbit = new Container();
    orbit.position.set(fleet.x, fleet.y);
    const rings = new Graphics();
    const radiusOf = (i: number) => 74 + (i % 2) * 24 + Math.floor(i / 24) * 52;
    for (const r of new Set(crew.map((_, i) => radiusOf(i)))) rings.circle(0, 0, r).stroke({ width: 1, color: fleet.color, alpha: 0.2 });
    orbit.addChild(rings);
    const ringSize = (i: number) => Math.min(24, crew.length - Math.floor(i / 24) * 24);
    const sats = crew.map((member, i) => {
      const node = new Container();
      const color = member.color ? hex(member.color) : 0xcfcaf2;
      const dot = new Graphics().circle(0, 0, 4).fill(color).circle(0, 0, 7).stroke({ width: 1.5, color: fleet.color, alpha: 0.8 });
      const text = new Text({ text: member.name, style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: 0xe9e6ff } });
      text.anchor.set(0.5, 0);
      text.position.set(0, 9);
      node.addChild(dot, text);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = { contains: (x: number, y: number) => (x * x + y * y < 14 * 14) || (Math.abs(x) < text.width / 2 && y > 6 && y < 24) };
      node.on('pointertap', () => onSelectCrewRef.current(member));
      orbit.addChild(node);
      return { node, radius: radiusOf(i), phase: ((i % 24) / ringSize(i)) * Math.PI * 2 };
    });
    layer.addChild(orbit);
    crewRef.current = { orbit, sats };
  }, [crew, selectedFleet, events, ready]);

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
    vp.animate({ position: { x: (x0 + x1) / 2 + 180 / scale, y: (y0 + y1) / 2 + card / 2 / scale }, scale, time: flight(800), ease: 'easeInOutSine' });
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
      vp.animate({ position: { x: g.x, y: g.y }, scale: Math.max(vp.scale.x, 1.3), time: flight(700), ease: 'easeInOutSine' });
    }
  }, [selectedId, ready]);

  return <div ref={hostRef} className="galaxy" />;
}
