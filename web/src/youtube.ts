/**
 * Turns any common YouTube link into https://www.youtube.com/watch?v=<id>[&t=<n>s], or null if it
 * isn't a YouTube video link. Accepts watch?v=, youtu.be/, /shorts/, /embed/, /live/, m. and music.
 * hosts, and t= / start= times like 90, 90s or 1m30s. The viewer also runs stored links through
 * this, so only real YouTube video links are ever rendered.
 */
export function youtubeUrl(input: string | undefined): string | null {
  const raw = (input ?? '').trim()
  if (!raw) return null
  let u: URL
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) } catch { return null }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  let id = ''
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? ''
  else if (host === 'youtube.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') ?? ''
    else id = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] ?? ''
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null
  const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? ''
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/)
  const secs = m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0
  return `https://www.youtube.com/watch?v=${id}${secs > 0 ? `&t=${secs}s` : ''}`
}
