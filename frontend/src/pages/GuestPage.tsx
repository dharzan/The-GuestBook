import { type FormEvent, useState } from 'react'
import VoiceRecorder from '../components/VoiceRecorder'
import { submitMessage } from '../lib/api'

const MAX_LENGTH = 500

export default function GuestPage() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const remaining = MAX_LENGTH - text.length

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim()) {
      setError('Please write something thoughtful before sending.')
      setStatus('error')
      return
    }

    try {
      setStatus('loading')
      setError('')
      await submitMessage(text.trim())
      setText('')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to send message.')
    }
  }

  return (
    <div className="guest-grid">
      <section className="panel">
        <h2>Leave the couple a message</h2>
        <p className="panel-subtitle">
          This goes straight to their private guestbook. Keep it short and sweet!
        </p>
        <form className="message-form" onSubmit={handleSubmit}>
          <label htmlFor="guest-message">Your message</label>
          <textarea
            id="guest-message"
            name="text"
            rows={5}
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Share your wish, tip, or favorite memory..."
            disabled={status === 'loading'}
            required
          />
          <div className="form-meta">
            <span>{Math.max(0, remaining)} characters left</span>
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
        {status === 'success' && (
          <div className="message-success">Thanks! Your message is on its way.</div>
        )}
        {status === 'error' && error && <div className="message-error">Error: {error}</div>}      </section>

      <section className="panel">
        <h2>Prefer to speak?</h2>
        <p className="panel-subtitle">Record up to 60 seconds. Audio lives only on this computer.</p>
        <VoiceRecorder />
      </section>
    </div>
  )
}
