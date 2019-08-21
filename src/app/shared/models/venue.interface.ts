export interface Venue {
	id: string,
	anchor: Anchor,
	geometry: Geometry,
	name: string,
	aliases: string[],
	venueInfo: VenueInfo,
	boundingBox: BoundingBox
}

interface Anchor {
	coordinates: number[],
	type: number
}

interface Geometry {
	coordinates: number[],
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