import { useRef, useState } from 'react'

function AudioPlayer({ onAnalyserCreated, onModeChange, currentMode }) {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [volume, setVolume] = useState(0.5)
    const [isMuted, setIsMuted] = useState(false)
    const audioCtxRef = useRef(null)

    const audioTrack = "/psytrance-track.mp3"

    const togglePlay = () => {
        if (!audioRef.current) return

        if (!audioCtxRef.current) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext
                const audioCtx = new AudioContext()
                const analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256

                const source = audioCtx.createMediaElementSource(audioRef.current)
                source.connect(analyser)
                analyser.connect(audioCtx.destination)

                audioCtxRef.current = audioCtx
                if (onAnalyserCreated) {
                    onAnalyserCreated(analyser)
                }
            } catch (err) {
                console.warn("Web Audio API context note:", err)
            }
        }

        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume()
        }

        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(err => {
                    console.error("Audio playback error:", err)
                    setIsPlaying(false)
                })
        }
    }

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value)
        setVolume(newVolume)
        if (audioRef.current) {
            audioRef.current.volume = newVolume
            setIsMuted(newVolume === 0)
        }
    }

    const toggleMute = () => {
        if (!audioRef.current) return
        if (isMuted) {
            audioRef.current.volume = volume || 0.5
            setIsMuted(false)
        } else {
            audioRef.current.volume = 0
            setIsMuted(true)
        }
    }

    const cycleMode = () => {
        const nextMode = (currentMode % 3) + 1
        if (onModeChange) onModeChange(nextMode)
    }

    return (
        <div className="hidden sm:flex fixed bottom-4 right-4 z-50 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-3 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)] flex-wrap items-center gap-3">
            <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center transition-all shadow-md active:scale-95"
            >
                {isPlaying ? '⏸' : '▶'}
            </button>

            <div className="text-xs pr-2 hidden sm:block">
                <span className="block font-bold text-cyan-400">Psytrance Anthem</span>
                <span className="text-gray-400">{isPlaying ? `Visual Mode 0${currentMode}` : 'Click to start'}</span>
            </div>

            {/* Dugme za promenu vizuala */}
            <button
                onClick={cycleMode}
                className="px-3 py-1 text-xs rounded-xl font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all"
                title="Promeni Cymatics vizual"
            >
                ✨ Mode 0{currentMode}
            </button>

            <div className="flex items-center gap-2 border-l border-slate-700/60 pl-3">
                <button 
                    onClick={toggleMute}
                    className="text-gray-300 hover:text-cyan-400 text-sm transition-colors"
                >
                    {isMuted || volume === 0 ? '🔇' : '🔊'}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-700 accent-cyan-400 rounded-lg cursor-pointer"
                />
            </div>

            <audio
                ref={audioRef}
                src="/psytrance-track.mp3"
                preload="auto"
                loop
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    )
}

export default AudioPlayer