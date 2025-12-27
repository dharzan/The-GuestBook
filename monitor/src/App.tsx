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

  const exportCsv = (rows: string[][], filename: string) => {
    if (rows.length === 0) return
    const csv = rows.map((r) => r.map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportMessagesCsv = () => {
    const rows = [
      ['id', 'guestName', 'text', 'createdAt'],
      ...messages.map((m) => [String(m.id), m.guestName || '', m.text, m.createdAt]),
    ]
    exportCsv(rows, 'messages.csv')
  }

  const exportVoiceCsv = () => {
    const rows = [
      ['id', 'guestName', 'note', 'durationSeconds', 'createdAt', 'audioUrl'],
      ...voiceMessages.map((v) => [
        String(v.id),
        v.guestName || '',
        v.note || '',
        String(v.durationSeconds),
        v.createdAt,
        v.audioUrl,
      ]),
    ]
    exportCsv(rows, 'voice-messages.csv')
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Live feed</p>
          <h1>Guestbook monitor</h1>
          <p className="muted">Messages and voice notes submitted from the QR form.</p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={load} disabled={status === 'loading'} className="refresh-btn">
            {status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={exportMessagesCsv} disabled={messages.length === 0}>
            Export messages CSV
          </button>
          <button type="button" onClick={exportVoiceCsv} disabled={voiceMessages.length === 0}>
            Export voice CSV
          </button>
        </div>
      </header>

      {status === 'error' && <div className="alert">Warning: {error}</div>}

      <div className="columns">
        <section className="panel">
          <div className="panel-head">
            <h2>Text messages</h2>
            <p className="muted small">
              Newest first · capped at 1000 · showing {messages.length}
            </p>
          </div>
          {messages.length === 0 && status !== 'loading' && (
            <p className="muted">No messages yet.</p>
          )}
          <ul className="list">
            {messages.map((m) => (
              <li key={m.id} className="card">
                <p className="meta">
                  {m.guestName || 'Anonymous'} · {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="body">{m.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Voice notes</h2>
            <p className="muted small">
              Newest first · capped at 1000 · showing {voiceMessages.length}
            </p>
          </div>
          {voiceMessages.length === 0 && status !== 'loading' && (
            <p className="muted">No voice notes yet.</p>
          )}
          <ul className="list">
            {voiceMessages.map((v) => (
              <li key={v.id} className="card">
                <p className="meta">
                  {v.guestName || 'Anonymous'} · {new Date(v.createdAt).toLocaleString()} · {v.durationSeconds}s
                </p>
                {v.note && <p className="body">{v.note}</p>}
                {v.audioUrl ? (
                  <audio controls preload="none">
                    <source src={v.audioUrl} type={v.mimeType || 'audio/webm'} />
                    <source src={v.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <p className="muted small">Audio unavailable — failed to load.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
