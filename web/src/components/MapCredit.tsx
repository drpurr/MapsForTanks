import type { MapCredit as Credit } from '../types'

/** "Map by Santiago Reyes, Atlas of Azeroth: Forever. Used with the artist's permission." */
export function MapCredit({ credit, className }: { credit: Credit; className?: string }) {
  const who = credit.work ? `${credit.by}, ${credit.work}` : credit.by
  return (
    <p className={className}>
      Map by {credit.url ? <a href={credit.url} target="_blank" rel="noreferrer">{who}</a> : who}.
      {credit.note && ` ${credit.note}`}
    </p>
  )
}
