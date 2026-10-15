const AUTHOR_NAME = 'Petar Vlku'
const GITHUB_PROFILE = 'https://github.com/Peconjii'
const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/petar-vlku-a6445b294/'

const repos = [
    { label: 'Frontend', href: 'https://github.com/Peconjii/psytrance-tracker' },
    { label: 'Backend', href: 'https://github.com/Peconjii/psytrance-tracker-backend' },
]

const dataSources = [
    { label: 'Goabase', href: 'https://www.goabase.net' },
    { label: 'Open-Meteo', href: 'https://open-meteo.com' },
    { label: 'YouTube', href: 'https://www.youtube.com' },
]

const linkClass = 'text-purple-300 hover:text-cyan-400 transition-colors'
const iconClass = 'p-2 rounded-xl text-purple-300 hover:text-cyan-400 hover:bg-slate-800/60 border border-cyan-500/20 hover:border-cyan-400/60 transition-all'

function ExternalLink({ href, className = linkClass, children, ...props }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
            {children}
        </a>
    )
}

function Footer() {
    return (
        <footer className="relative z-10 w-full px-4 pt-12 pb-6">
            <div className="max-w-7xl mx-auto backdrop-blur-md bg-slate-900/60 border border-cyan-500/30 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.15)] px-6 py-5 flex flex-col gap-4 text-sm">

                {/* Author + social icons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-slate-300">
                        <span className="font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
                            Psytrance Event Tracker
                        </span>
                        {' '}· built by{' '}
                        <ExternalLink href={LINKEDIN_PROFILE}>{AUTHOR_NAME}</ExternalLink>
                    </p>

                    <div className="flex items-center gap-2">
                        <ExternalLink href={GITHUB_PROFILE} className={iconClass} aria-label="GitHub profile">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54v-1.9c-3.13.68-3.79-1.51-3.79-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.16a10.7 10.7 0 0 1 5.64 0c2.15-1.46 3.1-1.16 3.1-1.16.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.78.54 4.46-1.49 7.68-5.7 7.68-10.67C23.25 5.48 18.27.5 12 .5Z" />
                            </svg>
                        </ExternalLink>
                        {LINKEDIN_PROFILE && (
                            <ExternalLink href={LINKEDIN_PROFILE} className={iconClass} aria-label="LinkedIn profile">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
                                </svg>
                            </ExternalLink>
                        )}
                    </div>
                </div>

                <div className="h-[1px] bg-slate-800" />

                {/* Source code + data attribution */}
                <div className="flex flex-col md:flex-row md:justify-between gap-2 text-slate-400">
                    <p>
                        Source code:{' '}
                        {repos.map((repo, i) => (
                            <span key={repo.href}>
                                {i > 0 && ' · '}
                                <ExternalLink href={repo.href}>{repo.label}</ExternalLink>
                            </span>
                        ))}
                    </p>
                    <p>
                        Data:{' '}
                        {dataSources.map((source, i) => (
                            <span key={source.href}>
                                {i > 0 && ' · '}
                                <ExternalLink href={source.href}>{source.label}</ExternalLink>
                            </span>
                        ))}
                    </p>
                </div>

                <p className="text-xs text-slate-500">
                    © {new Date().getFullYear()} {AUTHOR_NAME} · Not affiliated with Goabase. The backend runs on a free tier, so the first load can take a minute.
                </p>
            </div>
        </footer>
    )
}

export default Footer
