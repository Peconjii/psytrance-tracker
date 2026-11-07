import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startAnalytics } from './analytics.js'
import { startErrorReports } from './monitoring.js'
import { loadAddedGenres } from './map/data/addedGenres'
import { loadDiscography } from './map/data/discography'

// Installable on phones (see public/sw.js); only in the built site, so local development is never cached
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker not registered:', err))
  })
}

startErrorReports()
// Genres admins added to the galaxy: every page that lists genres (filters, stage genres, the galaxy) gets them
loadAddedGenres()
// Albums and festival sets, which artists and festivals edit
loadDiscography()
startAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
