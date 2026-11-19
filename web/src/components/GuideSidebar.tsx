import { useEffect, useMemo, useRef } from 'react'
import { inline, parseMarkdown, sameTitle } from '../markdown'

/**
 * The written guide beside the map. A heading whose text matches the open route section's title
 * is marked as current and scrolled into view inside the sidebar (the page itself doesn't move).
 */
export function GuideSidebar({ text, current, onHide }: { text: string; current?: string; onHide: () => void }) {
  return (
    <aside className="guide" aria-labelledby="guide-title">
      <div className="guide-head">
        <h2 id="guide-title">Guide</h2>
        <button type="button" className="guide-toggle" onClick={onHide} aria-label="Hide the written guide">Hide</button>
      </div>
      <GuideBody text={text} current={current} />
    </aside>
  )
}

/** The rendered guide text; also the editor's live preview. */
export function GuideBody({ text, current }: { text: string; current?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text])
  const body = useRef<HTMLDivElement>(null)
  const currentIndex = current
    ? blocks.findIndex((b) => b.kind === 'heading' && b.level >= 2 && sameTitle(b.text, current))
    : -1

  useEffect(() => {
    const box = body.current
    const el = box?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!box) return
    const top = el ? el.offsetTop - box.offsetTop - 8 : 0
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  }, [currentIndex])

  return (
    <div className="guide-body" ref={body} tabIndex={0}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'heading': {
            // the sidebar's own title is the h2, so guide headings start at h3
            const Tag = (['h3', 'h3', 'h4', 'h5'] as const)[b.level - 1]
            const here = i === currentIndex
            return (
              <Tag key={i} className={here ? 'here' : undefined} aria-current={here ? 'location' : undefined}>
                {inline(b.text)}
              </Tag>
            )
          }
          case 'p': return <p key={i}>{inline(b.text)}</p>
          case 'quote': return <blockquote key={i}>{inline(b.text)}</blockquote>
          case 'hr': return <hr key={i} />
          case 'ul': return <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
          case 'ol': return <ol key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>
        }
      })}
    </div>
  )
}
