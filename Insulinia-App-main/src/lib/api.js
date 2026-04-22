const resolveDefaultApiUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    const hostname = window.location.hostname || 'localhost'
    return `${protocol}//${hostname}:3000`
  }
  return 'http://localhost:3000'
}

const rawApiUrl = (import.meta.env.VITE_API_URL || resolveDefaultApiUrl()).trim()

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '')

export const apiUrl = (path) => {
  if (!path) return API_BASE_URL
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
