const API_BASE = import.meta.env.VITE_API_BASE || ''

type ApiMessage = {
  id: number
  guest_name: string
  text: string
  created_at: string
}

type ApiVoiceMessage = {
  id: number
  guest_name: string
  note: string
  duration_seconds: number
  mime_type: string
  created_at: string
}

export type Message = {
  id: number
  guestName: string
  text: string
  createdAt: string
}

export type VoiceMessage = {
  id: number
  guestName: string
  note: string
  durationSeconds: number
  createdAt: string
  audioUrl: string
}

function withApiBase(path: string) {
  if (!API_BASE) return path
  return `${API_BASE}${path}`
}

async function handleResponse(response: Response) {
  if (response.ok) return
  const text = await response.text()
  throw new Error(text || 'Request failed')
}

export async function submitMessage(name: string, text: string) {
  const response = await fetch(withApiBase('/message'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name, text }),
  })
  await handleResponse(response)
}

export async function submitVoiceMessage(
  blob: Blob,
  durationSeconds: number,
  note: string,
  name: string,
) {
  const form = new FormData()
  form.append('duration', String(durationSeconds))
  form.append('audio', blob, 'voice-message.webm')
  form.append('name', name)
  if (note.trim()) {
    form.append('note', note.trim())
  }
  const response = await fetch(withApiBase('/voice-message'), {
    method: 'POST',
    body: form,
  })
  await handleResponse(response)
}

export async function listMessages(): Promise<Message[]> {
  const response = await fetch(withApiBase('/admin'), {
    headers: {
      Accept: 'application/json',
    },
  })
  await handleResponse(response)
  const payload = (await response.json()) as ApiMessage[]
  return payload.map((item) => ({
    id: item.id,
    guestName: item.guest_name,
    text: item.text,
    createdAt: item.created_at,
  }))
}

export async function listVoiceMessages(): Promise<VoiceMessage[]> {
  const response = await fetch(withApiBase('/voice-messages'), {
    headers: {
      Accept: 'application/json',
    },
  })
  await handleResponse(response)
  const payload = (await response.json()) as ApiVoiceMessage[]
  return payload.map((item) => ({
    id: item.id,
    guestName: item.guest_name,
    note: item.note,
    durationSeconds: item.duration_seconds,
    createdAt: item.created_at,
    audioUrl: withApiBase(`/voice-messages/${item.id}/audio`),
  }))
}
