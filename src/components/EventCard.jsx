function EventCard({ events }) {
    return (
        <div>
            <h2>{events.name}</h2>
            <p>{events.dates.start.localDate}</p>
            <img src={events.images[0].url}></img>
            <a href={events.url}>Kupi kartu</a>
            <p>{events._embedded.venues[0].name} i {events._embedded.venues[0].city.name} </p>
        </div>
    )
}

export default EventCard