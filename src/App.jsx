import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { FavoritesProvider } from './context/FavoritesContext'
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
import CymaticsBackground from './components/CymaticsBackground'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-x-hidden">
            <CymaticsBackground />

            <Navbar />

            <main className="relative z-10 flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/map" element={<GlobalMap />} />
                <Route path="/artists" element={<Artists />} />
                <Route path="/artists/:slug" element={<Artist />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

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
              </Routes>
            </main>

            <Footer />
          </div>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App