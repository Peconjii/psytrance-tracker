import { useState } from 'react'
import EventFeed from '../components/EventFeed.jsx'
import useDebouncedValue from '../hooks/useDebouncedValue.js'

const GENRES = ['All', 'Psytrance', 'Progressive', 'Full On', 'Dark', 'Forest', 'Goa', 'Hi-Tech', 'Zenonesque']
// value = what the backend expects (EventTimeline enum), label = what the user sees
const TIMELINES = [
    { value: 'ALL', label: 'All' },
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'THIS_WEEKEND', label: 'This Weekend' },
    { value: 'PAST', label: 'Past Events' }
]

function Events() {
    const [search, setSearch] = useState('')
    const [country, setCountry] = useState('')
    const [genre, setGenre] = useState('All')
    const [timeline, setTimeline] = useState('ALL')

    // Text inputs wait until the user stops typing before asking the backend
    const debouncedSearch = useDebouncedValue(search.trim(), 300)
    const debouncedCountry = useDebouncedValue(country.trim(), 300)

    // A new key for every filter combination makes React start a fresh EventFeed from page 0
    const feedKey = [debouncedSearch, debouncedCountry, genre, timeline].join('|')

    return (
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 py-8">
            
            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    Psytrance Events Hub
                </h1>
                <p className="text-slate-400 text-sm mt-1">Discover, filter and track underground gatherings worldwide</p>
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-900/60 backdrop-blur-md p-4 sm:p-8 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] mb-8 border border-cyan-500/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Search Event / Town</label>
                        <input
                            type="text"
                            placeholder="e.g. Boom Festival..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-400 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Filter by Country</label>
                        <input
                            type="text"
                            placeholder="e.g. Serbia..."
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-slate-950/80 text-white placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-400 text-sm"
                        />
                    </div>

                    {/* Quick Status Selector Pills */}
                    <div>
                        <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Event Timeline</label>
                        <div className="flex flex-wrap gap-1.5">
                            {TIMELINES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setTimeline(t.value)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        timeline === t.value
                                            ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                            : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Genre Selector Pills */}
                <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subgenre</label>
                    <div className="flex flex-wrap gap-2">
                        {GENRES.map(g => (
                            <button
                                key={g}
                                onClick={() => setGenre(g)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                    genre === g
                                        ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105"
                                        : "bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reset Filters Button */}
                {(search || country || (genre && genre !== 'All') || timeline !== 'ALL') && (
                    <div className="mt-6 text-right border-t border-slate-800/80 pt-4">
                        <button
                            onClick={() => {
                                setSearch('')
                                setCountry('')
                                setGenre('All')
                                setTimeline('ALL')
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold tracking-wider uppercase underline cursor-pointer transition-colors"
                        >
                            Reset All Filters
                        </button>
                    </div>
                )}
            </div>

            <EventFeed
                key={feedKey}
                search={debouncedSearch}
                country={debouncedCountry}
                genre={genre}
                timeline={timeline}
            />
        </div>
    )
}

export default Events