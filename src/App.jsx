import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Events from './pages/Events'
import Navbar from './components/Navbar'

function App() {
 

  return (
      <BrowserRouter>
      <Navbar />
       <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/events' element={<Events />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App
