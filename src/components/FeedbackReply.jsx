import { useState } from 'react'
import { replyToFeedback } from '../api/backend.js'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// An admin's answer to a feedback message, emailed to its sender: the one already sent, or a form for one
function FeedbackReply({ item, onReplied }) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    if (item.replyText) {
        return (
            <div className="mt-3 pt-3 border-t border-dashed border-[var(--line)]">
                <p className="mono text-xs muted m-0">↳ Answered by @{item.repliedBy}, {DATE.format(new Date(item.repliedAt))} → {item.replyTo}</p>
                <p className="soft text-sm whitespace-pre-line m-0 mt-1">{item.replyText}</p>
            </div>
        )
    }
    if (!item.replyTo) return null

    const send = async (e) => {
        e.preventDefault()
        setSending(true)
        setError('')
        try {
            onReplied(await replyToFeedback(item.id, text.trim()))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send. Try again.')
        } finally {
            setSending(false)
        }
    }

    return open ? (
        <form className="mt-3 grid gap-2" onSubmit={send}>
            <label htmlFor={`reply-${item.id}`} className="field-label m-0">Answer by email to {item.replyTo}</label>
            <textarea id={`reply-${item.id}`} className="field" rows={3} maxLength={3000} required value={text}
                onChange={(e) => setText(e.target.value)} placeholder="Thanks for writing! …" />
            <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className="btn btn--primary" disabled={sending || !text.trim()}>{sending ? 'Sending…' : 'Send'}</button>
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
                {error && <span className="notice m-0">{error}</span>}
            </div>
        </form>
    ) : (
        <button type="button" className="btn btn--ghost mt-3" onClick={() => setOpen(true)}>↳ Answer by email</button>
    )
}

export default FeedbackReply
