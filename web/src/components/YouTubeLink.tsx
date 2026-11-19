import { youtubeUrl } from '../youtube'

/** YouTube play icon linking to a run video. Renders nothing unless `url` is a real YouTube video link. */
export function YouTubeLink({ url, name, size = 'large' }: { url?: string; name: string; size?: 'large' | 'small' }) {
  const href = youtubeUrl(url)
  if (!href) return null
  return (
    <a className={`yt-link yt-${size}`} href={href} target="_blank" rel="noreferrer" title="Watch on YouTube">
      <svg viewBox="0 0 28 20" width={size === 'large' ? 44 : 24} height={size === 'large' ? 31 : 17} aria-hidden="true" focusable="false">
        <rect width="28" height="20" rx="5.6" fill="#FF0000" />
        <path d="M11.2 5.7v8.6l7.4-4.3z" fill="#FFFFFF" />
      </svg>
      <span className="visually-hidden">Watch {name} on YouTube (opens in a new tab)</span>
    </a>
  )
}
