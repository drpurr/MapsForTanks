export type Pt = [number, number]

export interface Floor {
  floor: number
  artFloor: number
  label: string
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

export type MarkerType = 'boss' | 'entrance' | 'transition' | 'note'

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
