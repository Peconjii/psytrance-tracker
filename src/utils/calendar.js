export function openGoogleCalendar(event) {
    if (!event) return;

    const title = encodeURIComponent(event.nameParty || 'Psytrance Event');
    const location = encodeURIComponent(`${event.nameTown || ''}, ${event.nameCountry || ''}`);
    const details = encodeURIComponent(`Psytrance Event details: ${event.urlPartyHtml || ''}`);
    
    // Formatiranje datuma za Google Calendar (YYYYMMDD)
    const startDateRaw = event.dateStart ? event.dateStart.split('T')[0].replace(/-/g, '') : '';
    if (!startDateRaw) {
        alert("Event date is TBA.");
        return;
    }
    
    // Podrazumevano trajanje 1 dan
    const dates = `${startDateRaw}/${startDateRaw}`;

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    window.open(googleUrl, '_blank');
}