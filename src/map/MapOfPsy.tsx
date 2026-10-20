import { useEffect, useMemo, useState } from 'react';
import './map.css';
import { Galaxy, type Focus } from './galaxy/Galaxy';
import { Panel } from './components/Panel';
import { Player } from './components/Player';
import { Search } from './components/Search';
import { ToursMenu, TourBar } from './components/Tours';
import { Quiz } from './components/Quiz';
import { Compare } from './components/Compare';
import { PlaylistMenu } from './components/Playlist';
import { LabelsMenu } from './components/LabelsMenu';
import { usePlaylist } from './hooks/usePlaylist';
import {
  data, festivalById, genreById, genresOfArtist, genresOfLabel, labels, randomTrack, stopTrack, type Tour, type Track,
} from './data/types';

const MIN_YEAR = 1965;
const MAX_YEAR = new Date().getFullYear();

/** Shareable links: ?genre=forest&artist=Derango opens the map on that system */
function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const genre = q.get('genre');
  const artist = q.get('artist');
  const festival = q.get('festival');
  const label = q.get('label');
  return {
    genre: genre && genreById[genre] ? genre : null,
    artist: genre && artist && genresOfArtist(artist).some((g) => g.id === genre) ? artist : null,
    festival: festival && festivalById[festival] ? festival : null,
    label: label && labels[label] ? label : null,
  };
}

/** Map of Psy, the galaxy of psytrance genres: the home page of the site. */
export default function MapOfPsy() {
  const [initial] = useState(readUrl);
  const [selectedId, setSelectedId] = useState<string | null>(initial.genre);
  const [year, setYear] = useState(MAX_YEAR);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[] | null>(null);
  const [artist, setArtist] = useState<string | null>(initial.artist);
  const [festival, setFestival] = useState<string | null>(initial.festival);
  const [label, setLabel] = useState<string | null>(initial.label);
  const [compare, setCompare] = useState<[string, string] | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [tour, setTour] = useState<{ tour: Tour; index: number } | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [hidden, setHidden] = useState(false);
  const playlist = usePlaylist();
  const [timeTravel, setTimeTravel] = useState(false);
  const [menu, setMenu] = useState(false);

  // Time machine: plays history forward one year at a time, lighting stars as their genre appears
  useEffect(() => {
    if (!timeTravel) return;
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= MAX_YEAR) { setTimeTravel(false); return y; }
        return y + 1;
      });
    }, 380);
    return () => window.clearInterval(id);
  }, [timeTravel]);
  const born = data.genres.filter((g) => g.year === year).map((g) => g.name);
  const toggleTimeTravel = () => {
    if (!timeTravel && year >= MAX_YEAR) setYear(MIN_YEAR);
    setTimeTravel((t) => !t);
  };

  const tourPath = useMemo(() => (tour ? { ids: tour.tour.stops.map((s) => s.genre), index: tour.index } : null), [tour]);
  const focus = useMemo<Focus | null>(() => {
    if (compare) return { ids: compare, bottomCard: true };
    if (festival) { const f = festivalById[festival]; return { ids: f.genres, hub: { x: f.x, y: f.y } }; }
    if (label) { const l = labels[label]; return { ids: genresOfLabel(label).map((g) => g.id), hub: { x: l.x, y: l.y } }; }
    return null;
  }, [compare, festival, label]);

  // Keep the address bar in sync so the current view can be shared
  useEffect(() => {
    const q = new URLSearchParams();
    if (selectedId) q.set('genre', selectedId);
    if (selectedId && artist) q.set('artist', artist);
    if (festival) q.set('festival', festival);
    if (label) q.set('label', label);
    const url = q.size ? `?${q}` : window.location.pathname;
    window.history.replaceState(null, '', url);
    const name = artist ?? (festival ? festivalById[festival].name : null) ?? label ?? (selectedId ? genreById[selectedId].name : null);
    document.title = name ? `${name} · Map of Psy` : 'Map of Psy · interactive galaxy of psytrance';
  }, [selectedId, artist, festival, label]);

  const clearFocus = () => {
    setFestival(null);
    setLabel(null);
    setCompare(null);
  };
  const select = (id: string | null) => {
    clearFocus();
    setSelectedId(id);
    setArtist(null);
  };
  // Search must also reveal systems hidden by the year slider
  const reveal = (id: string, name: string | null = null) => {
    if (genreById[id].year > year) setYear(MAX_YEAR);
    clearFocus();
    setSelectedId(id);
    setArtist(name);
  };
  const openFestival = (id: string) => {
    select(null);
    setYear(MAX_YEAR);
    setFestival(id);
  };
  const openLabel = (name: string) => {
    select(null);
    setYear(MAX_YEAR);
    setLabel(name);
  };
  const openCompare = (a: string, b?: string) => {
    const other = b ?? data.links.find(([x, y]) => x === a || y === a)?.find((id) => id !== a) ?? 'goa';
    setYear(MAX_YEAR);
    setCompare([a, other]);
  };

  /** Plays a track; with a queue, the next one starts when it ends */
  const play = (t: Track | null, mystery = false, list: Track[] | null = null) => {
    setPlaying(t);
    setHidden(mystery);
    setQueue(list);
    // A new mystery track must not sit next to an open HUD that could give it away
    if (mystery) select(null);
  };
  const step = (dir: 1 | -1) => {
    if (!queue || !playing) return;
    const i = queue.findIndex((t) => t.youtube === playing.youtube);
    const next = queue[i + dir];
    if (next) setPlaying(next);
  };

  // Each stop flies to its system, moves the year slider forward and plays the stop's track
  const goToStop = (t: Tour, index: number) => {
    const stop = t.stops[index];
    select(stop.genre);
    setYear(Math.max(...t.stops.slice(0, index + 1).map((s) => genreById[s.genre].year)));
    const track = stopTrack(stop);
    if (track?.youtube) play(track);
    setQuiz(false);
    setTour({ tour: t, index });
  };
  const exitTour = () => {
    setTour(null);
    setYear(MAX_YEAR);
  };
  const startQuiz = () => {
    exitTour();
    select(null);
    play(null);
    setQuiz(true);
  };
  const exitQuiz = () => {
    setQuiz(false);
    setHidden(false);
  };
  // Jump to a random system and play one of its tracks
  const surprise = () => {
    if (tour) exitTour();
    const { genre, track } = randomTrack();
    setYear(MAX_YEAR);
    select(genre.id);
    play(track);
  };

  return (
    <div className={tour || quiz || compare ? 'psy-map app is-touring' : 'psy-map app'}>
      <Galaxy selectedId={selectedId} artist={artist} year={year} onSelect={select} onSelectArtist={reveal}
        tourPath={tourPath} focus={focus} showStations={showStations} onSelectFestival={openFestival}
        showLabels={showLabels} onSelectLabel={openLabel} />

      <header className="topbar">
        <div className="brand">
          <h1>MAP OF PSY</h1>
          <p className="brand__sub">interactive galaxy of psytrance</p>
        </div>
        <button className="menu-toggle" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="topbar-menu">
          {menu ? '✕ Close' : '☰ Menu'}
        </button>
        <div id="topbar-menu" className={menu ? 'topbar__menu is-open' : 'topbar__menu'}
          // On phones the menu closes as soon as something is picked inside a list
          onClick={(e) => { if ((e.target as HTMLElement).closest('.tours__list li button, .search__hits button, [data-closes-menu]')) setMenu(false); }}>
        <div className="legend">
          {Object.entries(data.families).map(([id, f]) => (
            <span key={id}><i style={{ background: f.color }} />{f.name}</span>
          ))}
          <button className={showStations ? 'legend__toggle is-on' : 'legend__toggle'} onClick={() => setShowStations((s) => !s)}
            aria-pressed={showStations} title="Click to show or hide festival stations">◇ Festivals {showStations ? 'on' : 'off'}</button>
          <button className={showLabels ? 'legend__toggle is-on is-label' : 'legend__toggle is-label'} onClick={() => setShowLabels((s) => !s)}
            aria-pressed={showLabels} title="Click to show or hide record labels">⬡ Labels {showLabels ? 'on' : 'off'}</button>
        </div>
        <div className="topbar__tools">
          <ToursMenu onStart={(t) => goToStop(t, 0)} />
          <LabelsMenu onOpen={openLabel} />
          <button className="tools__btn" onClick={startQuiz} data-closes-menu>Quiz</button>
          <button className="tools__btn" onClick={surprise} data-closes-menu title="Surprise me: random system and track" aria-label="Surprise me">🎲 Surprise</button>
          <PlaylistMenu playlist={playlist} playing={hidden ? null : playing} onPlay={(t) => play(t, false, playlist.items)} />
          <Search onSelect={(id, name) => { setMenu(false); reveal(id, name); }}
            onOpenLabel={(l) => { setMenu(false); openLabel(l); }} onOpenFestival={(id) => { setMenu(false); openFestival(id); }} />
        </div>
        </div>
      </header>

      <Panel genreId={selectedId} artist={artist} festival={festival} label={label}
        playing={hidden ? null : playing} playlist={playlist}
        onPlay={(t, list) => play(t, false, list ?? null)}
        onSelect={select} onSelectArtist={setArtist} onOpenFestival={openFestival} onOpenLabel={openLabel}
        onOpenArtist={(name) => reveal(genresOfArtist(name)[0].id, name)}
        onCompare={openCompare} onClose={() => select(null)} />

      <Player track={playing} hidden={hidden} playlist={playlist}
        hasPrev={!!queue && !!playing && queue.findIndex((t) => t.youtube === playing.youtube) > 0}
        hasNext={!!queue && !!playing && queue.findIndex((t) => t.youtube === playing.youtube) < queue.length - 1}
        onPrev={() => step(-1)} onNext={() => step(1)} onEnded={() => step(1)} onClose={() => play(null)} />

      {compare && (
        <Compare ids={compare} playing={playing} onChange={(a, b) => setCompare([a, b])}
          onPlay={(t) => play(t)} onClose={() => setCompare(null)} />
      )}

      {quiz && <Quiz onPlay={play} onReveal={(id) => { setYear(MAX_YEAR); select(id); }} onExit={exitQuiz} />}

      {tour && <TourBar tour={tour.tour} index={tour.index} onGo={(i) => goToStop(tour.tour, i)} onExit={exitTour} />}

      {timeTravel && born.length > 0 && (
        <div className="timeline__born" key={year} aria-live="polite">✦ {born.join(' · ')}</div>
      )}

      <footer className="timeline">
        <button className="timeline__play" onClick={toggleTimeTravel} aria-pressed={timeTravel}
          aria-label={timeTravel ? 'Pause the time machine' : 'Play history from 1965'} title={timeTravel ? 'Pause' : 'Play history'}>
          {timeTravel ? '❚❚' : '▶'}
        </button>
        <label htmlFor="year">YEAR</label>
        <input id="year" type="range" min={MIN_YEAR} max={MAX_YEAR} value={year}
          onChange={(e) => { setTimeTravel(false); setYear(Number(e.target.value)); }} />
        <output htmlFor="year">{year}</output>
      </footer>
    </div>
  );
}
