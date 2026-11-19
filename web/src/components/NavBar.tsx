import { useEffect, useState } from 'react'
import gem from '../assets/crest-gem.webp'

export type NavSection = 'dungeons' | 'raids' | 'credits' | null

/** id of the large crest on the index; while it's on screen the nav mark stays hidden. */
export const HERO_CREST_ID = 'hero-crest'

/**
 * Site navigation on every public page. The mark is the crest's hexagon gem plus the name, which
 * stays legible at nav size (the full crest doesn't). On the index the big crest already is the
 * brand, so the nav mark only appears once the crest has scrolled out of view.
 */
export function NavBar({ current, page }: { current: NavSection; page: string }) {
  /** Last observation of the hero crest, tagged with the page it was made on. */
  const [hero, setHero] = useState<{ page: string; visible: boolean } | null>(null)
  // Before the first observation, assume the index's crest is on screen (it starts at the top),
  // so the nav mark doesn't flash in and back out on load.
  const heroVisible = hero?.page === page ? hero.visible : page.startsWith('index')

  useEffect(() => {
    const el = document.getElementById(HERO_CREST_ID)
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setHero({ page, visible: entry.isIntersecting }), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [page])

  const item = (key: Exclude<NavSection, null>, href: string, label: string) => (
    <li><a href={href} aria-current={current === key ? 'page' : undefined}>{label}</a></li>
  )
  return (
    <header className="navbar">
      <nav aria-label="Site">
        <a href="#/" className={`nav-brand${heroVisible ? ' tucked' : ''}`}
          aria-hidden={heroVisible || undefined} tabIndex={heroVisible ? -1 : undefined}>
          <img src={gem} alt="" width={28} height={32} />
          <span>Tank Maps</span>
        </a>
        <ul>
          {item('dungeons', '#/', 'Dungeons')}
          {item('raids', '#/?show=raid', 'Raids')}
          {item('credits', '#/credits', 'Credits')}
        </ul>
      </nav>
    </header>
  )
}
