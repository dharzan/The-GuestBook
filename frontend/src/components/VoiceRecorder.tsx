import { useEffect, useRef, useState } from 'react'
import { submitVoiceMessage } from '../lib/api'

const MAX_DURATION = 60
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

type RecorderState = 'idle' | 'recording' | 'preview' | 'uploading' | 'success' | 'error'

export default function VoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(0)
  const [note, setNote] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!navigator.mediaDevices || typeof window.MediaRecorder === 'undefined') {
      setIsSupported(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupRecording()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const cleanupRecording = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
    intervalRef.current = null
    timeoutRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    chunksRef.current = []
  }

  const startRecording = async () => {
    if (!isSupported) return
    try {
      if (audioBlob || previewUrl) {
        resetRecording()
      }
      setError('')
      setState('recording')
      setDuration(0)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      const cleanupStream = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      recorder.onstop = () => {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        const blobType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: blobType })
        setAudioBlob(blob)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        const nextUrl = URL.createObjectURL(blob)
        setPreviewUrl(nextUrl)
        chunksRef.current = []
        cleanupStream()
        setState('preview')
      }

      startRef.current = Date.now()
      recorder.start()

      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.min(MAX_DURATION, Math.floor((Date.now() - startRef.current) / 1000))
        setDuration(elapsed)
      }, 200)
      timeoutRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording()
        }
      }, MAX_DURATION * 1000)
    } catch (err) {
      console.error(err)
      setError('Unable to access microphone. Check browser permissions.')
      setState('error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      const elapsed = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
      setDuration(Math.min(MAX_DURATION, elapsed))
    }
  }

  const resetRecording = () => {
    cleanupRecording()
    setAudioBlob(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setDuration(0)
    setNote('')
    setState('idle')
    setError('')
  }

  const handleUpload = async () => {
    if (!audioBlob) return
    try {
      setState('uploading')
      setError('')
      await submitVoiceMessage(audioBlob, duration, note)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setAudioBlob(null)
      setPreviewUrl(null)
      setDuration(0)
      setState('success')
      setNote('')
    } catch (err) {
      console.error(err)
      setState('error')
      setError(err instanceof Error ? err.message : 'Failed to upload voice message.')
    }
  }

  if (!isSupported) {
    return <div className="voice-card">Voice recording isn’t supported in this browser.</div>
  }

  function pickSupportedMimeType(): string | undefined {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return undefined
    return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  }

  return (
    <div className="voice-card">
      <div className="voice-header">
        <p className="voice-title">Voice note</p>
        <p className="voice-subtitle">Up to 60 seconds · stored locally</p>
      </div>

      <div className="voice-controls">
        <p className="timer-display">{new Date(duration * 1000).toISOString().substring(14, 19)}</p>
        {state !== 'recording' && (
          <button type="button" className="record-btn" onClick={startRecording}>
            Start recording
          </button>
        )}
        {state === 'recording' && (
          <button type="button" className="stop-btn" onClick={stopRecording}>
            Stop
          </button>
        )}
      </div>

      {audioBlob && previewUrl && (
        <div className="voice-preview">
          <audio controls src={previewUrl}></audio>
          <label htmlFor="voice-note">Caption (optional)</label>
          <input
            id="voice-note"
            type="text"
            maxLength={120}
            placeholder="Add a short caption"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="voice-actions">
            <button type="button" className="ghost-button" onClick={resetRecording}>
              Start over
            </button>
            <button type="button" onClick={handleUpload} disabled={state === 'uploading'}>
              {state === 'uploading' ? 'Uploading…' : 'Send voice note'}
            </button>
          </div>
        </div>
      )}

      {state === 'success' && <div className="message-success">✅ Voice note saved!</div>}
      {state === 'error' && error && <div className="message-error">⚠️ {error}</div>}
    </div>
  )
}
