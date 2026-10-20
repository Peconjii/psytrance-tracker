import { Link } from 'react-router-dom'

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

function ExternalLink({ href, children, ...props }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
        </a>
    )
}

function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-footer__inner">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="m-0">
                        <span className="site-footer__brand">Map of Psy</span>
                        {' '}· built by <ExternalLink href={LINKEDIN_PROFILE}>{AUTHOR_NAME}</ExternalLink>
                    </p>
                    <p className="m-0">
                        <Link to="/feedback">✎ Feedback</Link> ·{' '}
                        <ExternalLink href={GITHUB_PROFILE}>GitHub ↗</ExternalLink>
                        {LINKEDIN_PROFILE && <> · <ExternalLink href={LINKEDIN_PROFILE}>LinkedIn ↗</ExternalLink></>}
                    </p>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                    <p className="m-0">
                        Source code:{' '}
                        {repos.map((repo, i) => (
                            <span key={repo.href}>
                                {i > 0 && ' · '}
                                <ExternalLink href={repo.href}>{repo.label}</ExternalLink>
                            </span>
                        ))}
                    </p>
                    <p className="m-0">
                        Data:{' '}
                        {dataSources.map((source, i) => (
                            <span key={source.href}>
                                {i > 0 && ' · '}
                                <ExternalLink href={source.href}>{source.label}</ExternalLink>
                            </span>
                        ))}
                    </p>
                </div>
                <p className="m-0">
                    © {new Date().getFullYear()} {AUTHOR_NAME} · Not affiliated with Goabase. The backend runs on a free tier, so the first load can take a minute.
                </p>
            </div>
        </footer>
    )
}

export default Footer
