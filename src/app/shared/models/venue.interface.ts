import { Anchor } from './anchor.interface';

export interface Venue {
    id: string,
    anchor: Anchor,
    geometry: Geometry,
    name: string,
    aliases: string[],
    venueInfo: VenueInfo,
    image?: string,
    boundingBox: BoundingBox
}

interface Geometry {
    coordinates: number[],
    bbox?: number[],
    type: number
}

interface VenueInfo {
    name: string,
    aliases: string[],
    language: string
}

interface BoundingBox {
    north: number
    south: number
    east: number
    west: number
}