import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import JoinStrip from './components/JoinStrip'
import { FavoritesProvider } from './context/FavoritesContext'
import { FollowsProvider } from './context/FollowsContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Each page is its own chunk, loaded when it is first opened: the galaxy (PixiJS) and the admin panel stay out
// of everyone else's first load
const MapOfPsy = lazy(() => import('./map/MapOfPsy'))
const Events = lazy(() => import('./pages/Events'))
const EventDetails = lazy(() => import('./pages/EventDetails'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Register = lazy(() => import('./pages/Register'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Profile = lazy(() => import('./pages/Profile'))
const GlobalMap = lazy(() => import('./pages/GlobalMap'))
const Artists = lazy(() => import('./pages/Artists'))
const Artist = lazy(() => import('./pages/Artist'))
const Organizers = lazy(() => import('./pages/Organizers'))
const Organizer = lazy(() => import('./pages/Organizer'))
const Label = lazy(() => import('./pages/Label'))
const Festival = lazy(() => import('./pages/Festival'))
const LabelEdit = lazy(() => import('./pages/LabelEdit'))
const FestivalEdit = lazy(() => import('./pages/FestivalEdit'))
const OrganizerEdit = lazy(() => import('./pages/OrganizerEdit'))
const Feedback = lazy(() => import('./pages/Feedback'))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'))
const AdminGenres = lazy(() => import('./pages/AdminGenres'))
const AdminHistory = lazy(() => import('./pages/AdminHistory'))
const AdminEvents = lazy(() => import('./pages/AdminEvents'))
const AdminRequests = lazy(() => import('./pages/AdminRequests'))
const AdminOurEvents = lazy(() => import('./pages/AdminOurEvents'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminReviews = lazy(() => import('./pages/AdminReviews'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AddEvent = lazy(() => import('./pages/AddEvent'))
const NewPage = lazy(() => import('./pages/NewPage'))
const Search = lazy(() => import('./pages/Search'))
const Labels = lazy(() => import('./pages/Labels'))
const Festivals = lazy(() => import('./pages/Festivals'))
const Privacy = lazy(() => import('./pages/Privacy'))
const EmbedGigs = lazy(() => import('./pages/EmbedGigs'))
const ArtistEdit = lazy(() => import('./pages/ArtistEdit'))

// The home page is the galaxy map, which fills the window under the navbar, so it has no footer
function Shell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  // Widgets for other websites (in an iframe) come without the site's menu and footer
  if (pathname.startsWith('/embed/')) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route path="/embed/artists/:slug" element={<EmbedGigs />} />
        </Routes>
      </Suspense>
    )
  }
  return (
    // On the home page the layout is exactly one window tall and the map takes what the navbar leaves
    <div className={`relative flex flex-col overflow-x-hidden ${isHome ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <Navbar />

      <main className={`relative z-10 flex-1 ${isHome ? 'min-h-0' : ''}`}>
        {/* While a page's chunk loads; usually a blink */}
        <Suspense fallback={<p className="page mono text-xs muted">Loading…</p>}>
        <Routes>
          <Route path="/" element={<MapOfPsy />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/map" element={<GlobalMap />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:slug" element={<Artist />} />
          <Route path="/organizers" element={<Organizers />} />
          <Route path="/organizers/:slug" element={<Organizer />} />
          <Route path="/labels" element={<Labels />} />
          <Route path="/labels/:name" element={<Label />} />
          <Route path="/festivals" element={<Festivals />} />
          <Route path="/festivals/:id" element={<Festival />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/new-page" element={<NewPage />} />
          <Route path="/search" element={<Search />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Only for logged-in users; guests are redirected to /login */}
          <Route 
            path="/favorites" 
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* For admins; the backend checks it again on every request */}
          <Route path="/admin" element={<AdminRoute editors><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
          <Route path="/admin/genres" element={<AdminRoute editors><AdminGenres /></AdminRoute>} />
          <Route path="/admin/events" element={<AdminRoute editors><AdminEvents /></AdminRoute>} />
          <Route path="/admin/history" element={<AdminRoute><AdminHistory /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
          <Route path="/admin/our-events" element={<AdminRoute editors><AdminOurEvents /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute editors><AdminReviews /></AdminRoute>} />
          {/* The artist's owner or an admin; the backend says who may */}
          <Route path="/artists/:slug/edit" element={<ProtectedRoute><ArtistEdit /></ProtectedRoute>} />
          <Route path="/events/new" element={<ProtectedRoute><AddEvent /></ProtectedRoute>} />
          <Route path="/events/added/:id/edit" element={<ProtectedRoute><AddEvent key="edit" /></ProtectedRoute>} />
          <Route path="/organizers/:slug/edit" element={<ProtectedRoute><OrganizerEdit /></ProtectedRoute>} />
          <Route path="/labels/:name/edit" element={<ProtectedRoute><LabelEdit /></ProtectedRoute>} />
          <Route path="/festivals/:id/edit" element={<ProtectedRoute><FestivalEdit /></ProtectedRoute>} />
        </Routes>
        </Suspense>
      </main>

      {!isHome && <JoinStrip />}
      {!isHome && <Footer />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <FollowsProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </FollowsProvider>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App