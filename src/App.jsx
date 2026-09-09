import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Events from './pages/Events'
import Navbar from './components/Navbar'
import { FavoritesProvider } from './context/FavoritesContext'
import Favorites from './pages/Favorites'
import { AuthProvider } from './context/AuthContext'
import Register from './pages/Register'
import Login from './pages/Login'
import Profile from './pages/Profile'
import GlobalMap from './pages/GlobalMap'
import CymaticsBackground from './components/CymaticsBackground'
import AudioPlayer from './components/AudioPlayer'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [analyser, setAnalyser] = useState(null)
  const [visualMode, setVisualMode] = useState(1)

  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
            <CymaticsBackground analyser={analyser} mode={visualMode} />

            <Navbar />

            <main className="relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/map" element={<GlobalMap />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Zaštićene rute — vidljive samo ulogovanim korisnicima */}
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

            <AudioPlayer onAnalyserCreated={setAnalyser} onModeChange={setVisualMode} currentMode={visualMode} />
          </div>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App