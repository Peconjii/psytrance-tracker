function EventCard({ events }) {
    return (
        <div className="flex-col justify-center bg-gray-700 rounded-xl overflow-hidden">
            <img src={events.images[0].url} className="w-full h-90 object-cover"></img>
            <div className="text-center">
                <h2 className="p-2 text-white text-3xl ">{events.name}</h2>
                <p className="p-2 text-white text-3xl">{events._embedded.venues[0].name} i {events._embedded.venues[0].city.name} </p>
                <a href={events.url} className="p-2 text-white text-2xl hover:text-cyan-400">Kupi kartu</a>
                <p className="p-2 text-white text-xl ">{events.dates.start.localDate}</p>
            </div>
        </div>
    )
}

export default EventCard