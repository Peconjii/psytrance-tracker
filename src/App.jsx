import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Events from './pages/Events'
import Navbar from './components/Navbar'
import { FavoritesProvider } from './context/FavoritesContext'

function App() {
 

  return (
    <FavoritesProvider>
        <BrowserRouter>
        <Navbar />
         <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/events' element={<Events />} />
          </Routes>
        </BrowserRouter>
     </FavoritesProvider>
  )
}

export default App
