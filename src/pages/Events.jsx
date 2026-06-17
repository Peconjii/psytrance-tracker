import EventCard from '../components/EventCard.jsx'
import { useState, useEffect } from 'react'
import fetchEvents from '../api/ticketmaster.js'


function Events() {

     const [search, useSearch] = useState("")

     const [events, setEvents] = useState([])
  
  useEffect(() => {
    async function takeData() {
      const data = await fetchEvents()
      setEvents(data)
    }
    takeData()
  }, [])

    return (
      <div className='grid grid-cols-3 gap-6 p-4'>
        { events.map(events => (
         <EventCard key={events.id} events={events} />
        ))}
      </div>
)}

export default Events