import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import MapOfPsy from './map/MapOfPsy'
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { FavoritesProvider } from './context/FavoritesContext'
import { FollowsProvider } from './context/FollowsContext'
import Favorites from './pages/Favorites'
import { AuthProvider } from './context/AuthContext'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Profile from './pages/Profile'
import GlobalMap from './pages/GlobalMap'
import Artists from './pages/Artists'
import Artist from './pages/Artist'
import Organizers from './pages/Organizers'
import Organizer from './pages/Organizer'
import OrganizerEdit from './pages/OrganizerEdit'
import Feedback from './pages/Feedback'
import AdminFeedback from './pages/AdminFeedback'
import AdminGenres from './pages/AdminGenres'
import AdminHistory from './pages/AdminHistory'
import AdminEvents from './pages/AdminEvents'
import AdminRequests from './pages/AdminRequests'
import AdminOurEvents from './pages/AdminOurEvents'
import AdminUsers from './pages/AdminUsers'
import AddEvent from './pages/AddEvent'
import ArtistEdit from './pages/ArtistEdit'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// The home page is the galaxy map, which fills the window under the navbar, so it has no footer
function Shell() {
  const isHome = useLocation().pathname === '/'
  return (
    // On the home page the layout is exactly one window tall and the map takes what the navbar leaves
    <div className={`relative flex flex-col overflow-x-hidden ${isHome ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <Navbar />

      <main className={`relative z-10 flex-1 ${isHome ? 'min-h-0' : ''}`}>
        <Routes>
          <Route path="/" element={<MapOfPsy />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/map" element={<GlobalMap />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:slug" element={<Artist />} />
          <Route path="/organizers" element={<Organizers />} />
          <Route path="/organizers/:slug" element={<Organizer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/feedback" element={<Feedback />} />

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
          <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
          <Route path="/admin/genres" element={<AdminRoute><AdminGenres /></AdminRoute>} />
          <Route path="/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
          <Route path="/admin/history" element={<AdminRoute><AdminHistory /></AdminRoute>} />
          <Route path="/admin/requests" element={<AdminRoute><AdminRequests /></AdminRoute>} />
          <Route path="/admin/our-events" element={<AdminRoute><AdminOurEvents /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          {/* The artist's owner or an admin; the backend says who may */}
          <Route path="/artists/:slug/edit" element={<ProtectedRoute><ArtistEdit /></ProtectedRoute>} />
          <Route path="/events/new" element={<ProtectedRoute><AddEvent /></ProtectedRoute>} />
          <Route path="/organizers/:slug/edit" element={<ProtectedRoute><OrganizerEdit /></ProtectedRoute>} />
        </Routes>
      </main>

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