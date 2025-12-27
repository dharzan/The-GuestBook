const ADMIN_USER = import.meta.env.VITE_ADMIN_USERNAME
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD

function resolveApiBase(): string {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE
  // Dev fallback: assume Go API on :3000 if monitor is running elsewhere (e.g., :5273)
  return 'http://localhost:3000'
}
const API_BASE = resolveApiBase()

type ApiMessage = {
  id: number
  guestName: string
  text: string
  createdAt: string
}

type ApiVoiceMessage = {
  id: number
  guestName: string
  note: string
  durationSeconds: number
  mimeType: string
  createdAt: string
  audioUrl: string
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

async function fetchVoiceAudio(id: number): Promise<string> {
  const response = await fetch(withApiBase(`/voice-messages/${id}/audio`), {
    headers: {
      ...adminAuthHeader(),
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Failed to load audio')
  }
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

function adminAuthHeader(): Record<string, string> {
  if (!ADMIN_USER || !ADMIN_PASS) return {}
  const token = btoa(`${ADMIN_USER}:${ADMIN_PASS}`)
  return { Authorization: `Basic ${token}` }
}

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

async function graphQLFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...adminAuthHeader(),
    },
    body: JSON.stringify({ query, variables }),
  })
  const payload = (await response.json()) as GraphQLResponse<T>
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message || 'Request failed')
  }
  if (!payload.data) {
    throw new Error('Request failed')
  }
  return payload.data
}

export async function listMessages(signal?: AbortSignal): Promise<Message[]> {
  const data = await graphQLFetch<{ messages: ApiMessage[] }>(
    `
      query Messages($limit: Int) {
        messages(limit: $limit) {
          id
          guestName
          text
          createdAt
        }
      }
    `,
    { limit: 200 },
  )
  return data.messages.map((item) => ({
    id: item.id,
    guestName: item.guestName,
    text: item.text,
    createdAt: item.createdAt,
  }))
}

export async function listVoiceMessages(signal?: AbortSignal): Promise<VoiceMessage[]> {
  const data = await graphQLFetch<{ voiceMessages: ApiVoiceMessage[] }>(
    `
      query VoiceMessages($limit: Int) {
        voiceMessages(limit: $limit) {
          id
          guestName
          note
          durationSeconds
          mimeType
          createdAt
          audioUrl
        }
      }
    `,
    { limit: 200 },
  )
  const withAudio = await Promise.all(
    data.voiceMessages.map(async (item) => {
      const audioUrl = await fetchVoiceAudio(item.id)
      return {
        id: item.id,
        guestName: item.guestName,
        note: item.note,
        durationSeconds: item.durationSeconds,
        createdAt: item.createdAt,
        audioUrl,
      }
    }),
  )
  return withAudio
}
