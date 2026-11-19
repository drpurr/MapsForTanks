export type Pt = [number, number]

/** Credit for maps that aren't the game's own art (e.g. fan-made maps used with permission). */
export interface MapCredit {
  by: string
  work?: string
  url?: string
  note?: string
}

export interface Floor {
  floor: number
  artFloor: number | null
  label: string
  credit?: MapCredit
  image: string
  width: number
  height: number
}

export interface Instance {
  slug: string
  mapId: number
  name: string
  directory: string
  type: 'dungeon' | 'raid'
  zone: string | null
  art: string | null
  sources: string[]
  floors: Floor[]
}

export interface PathSeg {
  id: string
  points: Pt[]
  arrow: 'none' | 'end' | 'both'
  style?: 'main' | 'alt' | 'optional'
}

export interface Boundary {
  id: string
  points: Pt[]
}

/** los = line-of-sight pull spot: break LOS here so casters come to you */
export type MarkerType = 'boss' | 'entrance' | 'transition' | 'note' | 'los'

export interface Marker {
  id: string
  type: MarkerType
  pos: Pt
  order?: number
  optional?: boolean
  text?: string
  toSection?: string
}

export interface Section {
  id: string
  title: string
  floor: number
  sourceImage?: string
  sourceUrl?: string
  baseImage?: string
  notes?: string
  path: PathSeg[]
  boundaries: Boundary[]
  markers: Marker[]
}

export interface Route {
  instance: string
  mapId: number
  source: 'mapsfortanks' | 'manual'
  reviewed: boolean
  notes?: string
  sections: Section[]
}

/** data/registration.json: tank image path -> homography into floor pixels */
export interface Registration {
  instance: string
  floor: number
  ok: boolean
  H: number[][]
  size: [number, number]
  floorSize: [number, number]
}
