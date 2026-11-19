// DEV-ONLY: edits data/guides/<slug>.md beside a live preview of the public sidebar.
import { useRef } from 'react'
import { GuideBody } from '../components/GuideSidebar'
import { parseMarkdown, sameTitle } from '../markdown'
import type { Section } from '../types'

export function GuideEditor({ text, onChange, sections, current, dirty, onSave }: {
  text: string
  onChange: (text: string) => void
  sections: Section[]
  current?: string
  dirty: boolean
  onSave: () => void
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  const headings = parseMarkdown(text).filter((b) => b.kind === 'heading' && b.level >= 2).map((b) => (b as { text: string }).text)
  const hasHeading = (title: string) => headings.some((h) => sameTitle(h, title))

  /** Adds `## <title>` for a section, after the heading of the section before it when there is one. */
  const addHeading = (title: string) => {
    const trimmed = text.replace(/\s*$/, '')
    const lines = trimmed ? trimmed.split('\n') : []
    const idx = sections.findIndex((s) => s.title === title)
    const nextTitles = sections.slice(idx + 1).map((s) => s.title)
    // insert before the first heading that belongs to a later section, else at the end
    const at = lines.findIndex((l) => /^##\s/.test(l.trim()) && nextTitles.some((t) => sameTitle(l.trim().replace(/^##\s+/, ''), t)))
    // heading, blank line, the line the cursor goes to (and a blank line before the next heading)
    const block = [`## ${title}`, '', '']
    const out = at >= 0 ? [...lines.slice(0, at), ...block, '', ...lines.slice(at)] : [...lines, ...(lines.length ? [''] : []), ...block]
    const next = out.join('\n')
    onChange(next)
    // put the cursor on the new heading's empty body line
    const head = `## ${title}\n\n`
    const caret = next.indexOf(head, at >= 0 ? lines.slice(0, at).join('\n').length : 0) + head.length
    requestAnimationFrame(() => { const el = area.current; if (el) { el.focus(); el.setSelectionRange(caret, caret) } })
  }

  return (
    <section className="guide-editor" aria-labelledby="guide-editor-title">
      <header>
        <h2 id="guide-editor-title">Written guide{dirty ? ' •' : ''}</h2>
        <p className="hint">
          Saved with the route to <code>data/guides/&lt;slug&gt;.md</code>. A <code>## Heading</code> matching a section
          title is highlighted while that section is open. Clear the text to remove the guide.
        </p>
      </header>
      {sections.length > 0 && (
        <ul className="guide-sections" aria-label="Section headings">
          {sections.map((s) => hasHeading(s.title)
            ? <li key={s.id} className="has">✓ {s.title}</li>
            : <li key={s.id}><button type="button" onClick={() => addHeading(s.title)} title="Add a heading for this section">+ {s.title}</button></li>)}
        </ul>
      )}
      <div className="guide-editor-panes">
        <label>
          <span className="visually-hidden">Guide Markdown</span>
          <textarea ref={area} value={text} spellCheck onChange={(e) => onChange(e.target.value)}
            placeholder={'# Dungeon name\n\nOverview…\n\n## First section title\n\n- Pull the first pack back…'}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onSave() } }} />
        </label>
        <div className="guide guide-preview" aria-label="Preview">
          {text.trim() ? <GuideBody text={text} current={current} /> : <p className="hint">Preview appears here.</p>}
        </div>
      </div>
    </section>
  )
}
