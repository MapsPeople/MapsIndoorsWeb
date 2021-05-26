import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { Observable, ReplaySubject } from 'rxjs';
import { Building, Venue } from '@mapsindoors/typescript-interfaces';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class VenueService {

    miVenueService = mapsindoors.services.VenuesService;
    appConfig: any;
    fitVenues = true;

    private venueObservable = new ReplaySubject<Venue>(1);

    constructor(
        private appConfigService: AppConfigService,
        private mapsIndoorsService: MapsIndoorsService,
        private googleMapService: GoogleMapService,
    ) {
        this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
    }

    /**
     * Get all venues.
     *
     * @returns {Promise<Venue[]>} Returns an array of venue objects.
     */
    public getVenues(): Promise<Venue[]> {
        return mapsindoors.services.VenuesService.getVenues()
            .then((venues: Venue[]) => venues.map((venue): Venue => {
                venue.image = this.appConfig.venueImages[venue.name.toLowerCase()];
                return venue;
            }));
    }

    getVenueObservable(): Observable<any> {
        return this.venueObservable.asObservable();
    }
    /**
     * Get a venue by it's id.
     * @param {string} venueId
     * @returns {Promise} Promise resolves a Venue.
     */
    getVenueById(venueId: string): Promise<Venue> {
        return this.miVenueService.getVenue(venueId);
    }

    /**
     * Set venue and populate it with an image.
     * @param {Venue} venue The venue object.
     * @param appConfig The configurations for current solution.
     * @returns {Promise<void>}
     */
    setVenue(venue, appConfig, fitVenue = true): Promise<void> {
        return new Promise((resolve): void => {

            for (const venueName in appConfig.venueImages) {
                if (venue.name.toLowerCase() === venueName) {
                    venue.image = appConfig.venueImages[venue.name.toLowerCase()];
                }
            }

            this.mapsIndoorsService.mapsIndoors.setVenue(venue);
            if (fitVenue) {
                // TODO: Figure out timing issue here when using fitVenue when starting app. For now manually fit to venue bounds.
                this.googleMapService.map.fitBounds(new google.maps.LatLngBounds({ lat: venue.geometry.bbox[1], lng: venue.geometry.bbox[0] }, { lat: venue.geometry.bbox[3], lng: venue.geometry.bbox[2] }));
                // this.mapsIndoorsService.mapsIndoors.fitVenue(venue.id);
            }

            this.venueObservable.next(venue);
            resolve();
        });
    }

    /**
     * Get bounding box for venue.
     *
     * @param {Venue} venue The current venue.
     * @returns {google.maps.LatLngBounds} The venue bounding box.
     */
    getVenueBoundingBox(venue: Venue): google.maps.LatLngBounds {
        const coordinates = venue.geometry.coordinates[0];
        const lat = coordinates.map((point) => point[0]);
        const lng = coordinates.map((point) => point[1]);

        const bbox = { south: 90, west: 180, north: -90, east: -180 };
        bbox.south = Math.min(bbox.south, ...lat);
        bbox.west = Math.min(bbox.west, ...lng);
        bbox.north = Math.max(bbox.north, ...lat);
        bbox.east = Math.max(bbox.east, ...lng);

        const venueBounds = new google.maps.LatLngBounds({ lat: bbox.west, lng: bbox.south }, { lat: bbox.east, lng: bbox.north });
        return venueBounds;
    }

    /**
     * Get a building by its id.
     *
     * @param {string} buildingId
     * @returns {Promise<Building>}
     */
    async getBuildingById(buildingId: string): Promise<Building> {
        const buildingRequest = this.miVenueService.getBuilding(buildingId);
        const building = await buildingRequest;
        return building;
    }
}

