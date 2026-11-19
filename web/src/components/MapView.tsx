import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Registration } from '../types'
import { repoUrl } from '../data'

interface Props {
  base: string
  size: [number, number]
  /** Original mapsfortanks image warped onto the clean map via its homography. */
  source?: { path: string; reg: Registration; opacity: number } | null
  children?: (size: [number, number]) => ReactNode
  svgProps?: React.SVGProps<SVGSVGElement>
}

/** Homography (tank px -> floor px) as a CSS matrix3d (column-major). */
function matrix3d(H: number[][]) {
  const [[a, b, c], [d, e, f], [g, h, i]] = H
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].join(',')})`
}

export function MapView({ base, size, source, children, svgProps }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / size[0]))
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])

  return (
    <div className="mapview" ref={box} style={{ aspectRatio: `${size[0]} / ${size[1]}` }}>
      <img className="mapview-base" src={base} alt="" draggable={false} />
      {source && (
        <div className="mapview-source" style={{ opacity: source.opacity }}>
          <img
            src={repoUrl(source.path)}
            alt=""
            draggable={false}
            style={{
              width: source.reg.size[0],
              height: source.reg.size[1],
              transform: `scale(${scale}) ${matrix3d(source.reg.H)}`,
            }}
          />
        </div>
      )}
      <svg className="mapview-svg" viewBox={`0 0 ${size[0]} ${size[1]}`} {...svgProps}>
        {children?.(size)}
      </svg>
    </div>
  )
}
