import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { Observable, ReplaySubject } from 'rxjs';
import { Venue } from '../shared/models/venue.interface';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class VenueService {

    miVenueService = mapsindoors.services.VenuesService;
    appConfig: any;
    venue: Venue;
    venuesLength: number;
    favouredVenue: boolean;
    fitVenues = true;
    returnBtnActive = true;

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
        return new Promise((resolve, reject): void => {
            this.miVenueService.getVenues()
                .then((venues: Venue[]): void => {
                    for (const venue of venues) {
                        venue.image = this.appConfig.venueImages[venue.name.toLowerCase()];
                    }
                    resolve(venues);
                })
                .catch((err): void => {
                    reject(err);
                });
        });


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
            venue.anchor.center = [].concat(venue.anchor.coordinates).reverse();

            for (const venueName in appConfig.venueImages) {
                if (venue.name.toLowerCase() === venueName) {
                    venue.image = appConfig.venueImages[venue.name.toLowerCase()];
                }
            }
            // Used for return to "something" button
            this.mapsIndoorsService.setVenueAsReturnToValue(venue);
            this.returnBtnActive = true;
            this.favouredVenue = true;
            this.mapsIndoorsService.mapsIndoors.setVenue(venue);
            if (fitVenue) {
                // TODO: Figure out timing issue here when using fitVenue when starting app. For now manually fit to venue bounds.
                this.googleMapService.map.fitBounds(new google.maps.LatLngBounds({ lat: venue.geometry.bbox[1], lng: venue.geometry.bbox[0] }, { lat: venue.geometry.bbox[3], lng: venue.geometry.bbox[2] }));
                // this.mapsIndoorsService.mapsIndoors.fitVenue(venue.id);
            }

            Promise.all([
                this.getVenueBoundingBox(venue),
                this.miVenueService.getVenues()
            ]).then(([boundingBox, venues]): void => {
                venue.boundingBox = boundingBox;
                venue.onlyVenue = venues.length === 1 ? true : false;

                this.venue = venue;
                this.venueObservable.next(venue);
                resolve();
            });
        });
    }

    /**
     * Get bounding box of venue.
     *
     * @private
     * @param {Venue} venue The current venue.
     * @returns {Promise<{ [key: string]: number }>} The venue bounding box.
     */
    private getVenueBoundingBox(venue: Venue): Promise<{ [key: string]: number }> {
        return new Promise((resolve) => {
            const bounds = {
                east: -180,
                north: -90,
                south: 90,
                west: 180
            };
            venue.geometry.coordinates.reduce((bounds, ring: any) => {
                ring.reduce((bounds, coords) => {
                    bounds.east = coords[0] >= bounds.east ? coords[0] : bounds.east;
                    bounds.west = coords[0] <= bounds.west ? coords[0] : bounds.west;
                    bounds.north = coords[1] >= bounds.north ? coords[1] : bounds.north;
                    bounds.south = coords[1] <= bounds.south ? coords[1] : bounds.south;
                    return bounds;
                }, bounds);
                return bounds;
            }, bounds);
            resolve(bounds);
        });
    }


    /**
     * Get a building by its id.
     *
     * @param {string} buildingId
     * @returns {Promise<any>}
     */
    async getBuildingById(buildingId: string): Promise<any> {
        const buildingRequest = this.miVenueService.getBuilding(buildingId);
        const building = await buildingRequest;
        return building;
    }
}

