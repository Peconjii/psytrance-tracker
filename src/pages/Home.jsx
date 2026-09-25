import { Link } from 'react-router-dom'

function Home() {
    return (
        <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden">
            
            <div className="w-48 sm:w-96 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-8 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse" />

            <div className="relative z-10 max-w-3xl w-full mx-auto text-center p-8 sm:p-12 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
                
                <h1 className='text-4xl sm:text-6xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent mb-6 drop-shadow-lg'>
                    PSYTRANCE EVENT TRACKER
                </h1>

                <p className='text-slate-300 text-lg sm:text-2xl font-light leading-relaxed mb-10 max-w-xl mx-auto'>
                    Where bass meets the cosmos. <br />
                    <span className="text-cyan-400 font-medium">Find your tribe and feel the frequency.</span>
                </p>

                <div className='flex justify-center'>
                    <Link 
                        to="/events" 
                        className='group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-slate-950 font-bold text-lg sm:text-xl tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105 transition-all duration-300'
                    >
                        <span>Explore Events</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </div>

            <div className="w-48 sm:w-96 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent mt-8 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-pulse" />

        </div>
    )
}

export default Home