import EventCard from '../components/EventCard.jsx'
import { useState, useEffect } from 'react'
import fetchEvents from '../api/ticketmaster.js'


function Events() {
     const [loading, setLoading] = useState(true)

     const [search, setSearch] = useState("")

     const [events, setEvents] = useState([])

     const filteredEvents = events.filter(event => 
      event.name.toLowerCase().includes(search.toLowerCase())
     )
  
  useEffect(() => {
    async function takeData() {
      const data = await fetchEvents()
      setEvents(data)
      setLoading(false)
    }
    takeData()
  }, [])

    return (
    <div>
      {loading ? (
        <p className='text-center text-dark text-2xl'>Loading...</p>
      ) : (
        <>
         <input 
        type='text'
        placeholder='Search events...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className='w-full max-w-md mx-auto block bg-white-500 text-dark placeholder-gray-400 px-4 py-3 m-3 rounded-xl border border-gray-700 focus:outline-none focus:border-cyan-400 mb-6'
        />
        <div className='grid grid-cols-3 gap-6 p-4'>
        { filteredEvents.map(events => (
         <EventCard key={events.id} events={events} />
        ))}
        </div>
        </>
      )}

    </div>
)}

export default Events