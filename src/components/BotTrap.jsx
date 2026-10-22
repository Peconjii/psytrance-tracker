// The hidden "website" field of the public forms: people never see it (nor screen readers), only bots fill it in,
// and the backend turns those sends away (see its FormLimits). Put it inside the form and send `website` along.
function BotTrap({ id, value, onChange }) {
    return (
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor={id}>Website</label>
            <input id={id} type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
    )
}

export default BotTrap
