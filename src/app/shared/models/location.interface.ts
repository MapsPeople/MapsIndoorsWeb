import { Anchor } from './anchor.interface';

export interface Location {
    id: string,
    type: string,
    geometry: {
        type: string
        coordinates: Array<number>
    },
    properties: LocationProperties
}

interface LocationProperties {
    aliases: string[],
    anchor: Anchor,
    building: string,
    buildingId: string,
    categories: string[]
    contact: Contact,
    description: string
    displayRule: any
    fields: { [key: string]: { value: string } }
    floor: string,
    floorName: string,
    imageURL?: any,
    iconUrl?: string,
    locationType: string,
    mapElement: string,
    name: string,
    externalId: string,
    streetViewConfig?: StreetViewConfig,
    subtitle?: string,
    type: string,
    venue: string,
    venueId: string,
    geodesicDistance?: number,
    capacity?: number
}

interface Contact {
    email: string
    phone: number
    website: string
}

interface StreetViewConfig {
    panoramaId: string,
    povHeading: number
    povPitch: number
}
