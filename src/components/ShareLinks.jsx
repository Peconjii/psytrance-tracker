// WhatsApp and Telegram share links that point to the event's page in this app
function ShareLinks({ event }) {
    const shareText = encodeURIComponent(`Check out this psytrance event: ${event.nameParty} in ${event.nameTown}! 🛸`)
    const shareUrl = encodeURIComponent(`${window.location.origin}/events/${event.id}`)

    return (
        <div className="flex gap-2">
            <a
                href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                target="_blank"
                rel="noreferrer"
                className="chip no-underline"
                title="Share on WhatsApp"
            >
                WhatsApp ↗
            </a>
            <a
                href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="chip no-underline"
                title="Share on Telegram"
            >
                Telegram ↗
            </a>
        </div>
    )
}

export default ShareLinks
