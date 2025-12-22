import { useEffect, useState } from 'react'
import './App.css'
import { listMessages, listVoiceMessages, type Message, type VoiceMessage } from './lib/api'

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [error, setError] = useState('')

  const load = async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      setStatus('loading')
      const [text, voice] = await Promise.all([
        listMessages(controller.signal),
        listVoiceMessages(controller.signal),
      ])
      setMessages(text)
      setVoiceMessages(voice)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unable to load data.')
    } finally {
      window.clearTimeout(timeout)
    }
  }

  useEffect(() => {
    load().catch(() => {
      /* handled in state */
    })
  }, [])

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Live feed</p>
          <h1>Guestbook monitor</h1>
          <p className="muted">Messages and voice notes submitted from the QR form.</p>
        </div>
        <button type="button" onClick={load} disabled={status === 'loading'} className="refresh-btn">
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {status === 'error' && <div className="alert">Warning: {error}</div>}

      <div className="columns">
        <section className="panel">
          <div className="panel-head">
            <h2>Text messages</h2>
            <p className="muted small">Newest first · capped at 200</p>
          </div>
          {messages.length === 0 && status !== 'loading' && (
            <p className="muted">No messages yet.</p>
          )}
          <ul className="list">
            {messages.map((m) => (
              <li key={m.id} className="card">
                <p className="body">{m.text}</p>
                <p className="meta">{new Date(m.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Voice notes</h2>
            <p className="muted small">Newest first · capped at 200</p>
          </div>
          {voiceMessages.length === 0 && status !== 'loading' && (
            <p className="muted">No voice notes yet.</p>
          )}
          <ul className="list">
            {voiceMessages.map((v) => (
              <li key={v.id} className="card">
                <p className="meta">
                  {new Date(v.createdAt).toLocaleString()} · {v.durationSeconds}s
                </p>
                {v.note && <p className="body">{v.note}</p>}
                <audio controls src={v.audioUrl} preload="none"></audio>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
