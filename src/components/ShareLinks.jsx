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
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs"
                title="Share on WhatsApp"
            >
                💬 WA
            </a>
            <a
                href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-xs"
                title="Share on Telegram"
            >
                ✈️ TG
            </a>
        </div>
    )
}

export default ShareLinks
