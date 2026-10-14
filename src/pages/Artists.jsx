import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArtists } from '../api/backend.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'

// Artists found in the line-ups of upcoming events, busiest first. The backend reads line-ups
// from Goabase a few events at a time, so right after a fresh start the list fills up gradually.
function Artists() {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim(), 300)
    // Tagged with the search it belongs to, so a slow old answer never replaces a newer one
    const [result, setResult] = useState({ search: null, artists: [], error: null })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        const controller = new AbortController()
        fetchArtists(debouncedSearch, controller.signal)
            .then(artists => setResult({ search: debouncedSearch, artists, error: null }))
            .catch(err => {
                if (controller.signal.aborted) return
                setResult({
                    search: debouncedSearch,
                    artists: [],
                    error: err.response?.data?.message || 'Could not load artists. Is the backend running?'
                })
            })
        return () => controller.abort()
    }, [debouncedSearch, attempt])

    const loading = result.search !== debouncedSearch

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    Artists
                </h1>
                <p className="text-slate-400 text-sm mt-1">Find out where your favorite artists play next</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] mb-8 border border-cyan-500/30">
                <label htmlFor="artist-search" className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Search Artist
                </label>
                <input
                    id="artist-search"
                    type="text"
                    placeholder="e.g. Astrix, Ace Ventura..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-400 text-sm"
                />
            </div>

            {result.error ? (
                <div className="text-center py-10">
                    <p className="text-red-400 text-sm mb-3">{result.error}</p>
                    <button
                        onClick={() => setAttempt(count => count + 1)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            ) : loading && result.artists.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl" />
                    ))}
                </div>
            ) : result.artists.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-md">
                    <p className="text-slate-300 text-lg font-medium">
                        {debouncedSearch ? `No upcoming events with "${debouncedSearch}" in the line-up.` : 'No artists found yet.'}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Line-ups are read in the background a few events at a time, so check back in a little while.
                    </p>
                </div>
            ) : (
                <ul className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                    {result.artists.map(artist => (
                        <li key={artist.slug}>
                            <Link
                                to={`/artists/${encodeURIComponent(artist.slug)}`}
                                state={{ name: artist.name }}
                                className="flex items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-cyan-400/60 rounded-2xl px-4 py-3 transition-all group"
                            >
                                <span className="font-semibold text-white group-hover:text-cyan-300 truncate">{artist.name}</span>
                                <span className="shrink-0 text-xs text-purple-300 font-semibold">
                                    {artist.upcomingEvents} {artist.upcomingEvents === 1 ? 'event' : 'events'}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default Artists
