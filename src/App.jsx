import { useState, useEffect } from 'react'
import './App.css'
import fetchEvents from './api/ticketmaster.js'
import EventCard from './components/EventCard.jsx'

function App() {
  const [events, setEvents] = useState([])
  useEffect(() => {
    async function takeData() {
      const data = await fetchEvents()
      setEvents(data)
    }
    takeData()
  }, [])

  return (
    <>
      <div>
        <h1>Psytrance Event Tracker</h1>
        { events.map(events => (
          <EventCard key={events.id} events={events} />
        ))}
      </div>
    </>
  )
}

export default App
