import type { ReactNode } from 'react'

/**
 * A small Markdown subset for the written guides, rendered to React elements (never raw HTML):
 * `#`–`####` headings, paragraphs, `-`/`*` and `1.` lists, `>` quotes, `---` rules,
 * **bold**, *italic*, `code` and [links](https://…).
 */
export type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'hr' }

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let quote: string[] = []
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null
  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') })
    if (quote.length) blocks.push({ kind: 'quote', text: quote.join(' ') })
    if (list) blocks.push(list)
    para = []; quote = []; list = null
  }
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    let m: RegExpMatchArray | null
    if (!line) { flush(); continue }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); blocks.push({ kind: 'heading', level: m[1].length, text: m[2] }); continue }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); blocks.push({ kind: 'hr' }); continue }
    if ((m = line.match(/^>\s?(.*)$/))) { if (para.length || list) flush(); quote.push(m[1]); continue }
    const item = line.match(/^[-*]\s+(.*)$/) ? 'ul' : line.match(/^\d+[.)]\s+(.*)$/) ? 'ol' : null
    if (item) {
      if (para.length || quote.length || (list && list.kind !== item)) flush()
      list ??= { kind: item, items: [] }
      list.items.push(line.replace(/^([-*]|\d+[.)])\s+/, ''))
      continue
    }
    // a plain line right after a list item continues that item
    if (list) { list.items[list.items.length - 1] += ' ' + line; continue }
    if (quote.length) flush()
    para.push(line)
  }
  flush()
  return blocks
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g

export function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (/^(\*\*|__)/.test(part)) return <strong key={i}>{inline(part.slice(2, -2))}</strong>
    if (/^[*_]/.test(part) && part.length > 2) return <em key={i}>{inline(part.slice(1, -1))}</em>
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const href = link[2]
      // only web links and in-app (#/…) links; anything else stays plain text
      if (/^https?:\/\//.test(href)) return <a key={i} href={href} target="_blank" rel="noreferrer">{inline(link[1])}</a>
      if (href.startsWith('#')) return <a key={i} href={href}>{inline(link[1])}</a>
      return <span key={i}>{inline(link[1])}</span>
    }
    return part
  })
}

/** Plain text of a heading, for matching it to a route section title. */
export const plain = (s: string) => s.replace(/[*_`]|\[([^\]]+)\]\([^)]*\)/g, '$1').trim()
export const sameTitle = (a: string, b: string) => {
  const norm = (s: string) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return norm(a) === norm(b)
}
