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
import Profile from './pages/Profile'
import GlobalMap from './pages/GlobalMap'
import Artists from './pages/Artists'
import Artist from './pages/Artist'
import Feedback from './pages/Feedback'
import AdminFeedback from './pages/AdminFeedback'
import AdminGenres from './pages/AdminGenres'
import AdminHistory from './pages/AdminHistory'
import AdminEvents from './pages/AdminEvents'
import AdminArtistProfile from './pages/AdminArtistProfile'
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
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/admin/artists/:slug/profile" element={<AdminRoute><AdminArtistProfile /></AdminRoute>} />
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