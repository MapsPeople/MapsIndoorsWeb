import { Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { GoogleMapService } from './google-map.service';
import { Injectable } from '@angular/core';
import { MapsIndoorsService } from './maps-indoors.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';
import { TranslateService } from '@ngx-translate/core';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { Category } from '../shared/models/category.interface';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class LocationService {

    appConfig: any;
    venue: Venue;
    // Used for restoring page when going back search page
    private searchQuery: string;
    private selectedCategory: Category;

    private selectedLocation = new ReplaySubject<Location>(1);
    polygon: google.maps.Polygon;

    private clusteredLocations = new BehaviorSubject<Location[]>([]);

    constructor(
        private translateService: TranslateService,
        private appConfigService: AppConfigService,
        private mapsIndoorsService: MapsIndoorsService,
        private googleMapService: GoogleMapService,
        private venueService: VenueService,
        private searchService: SearchService,
    ) {
        this.appConfigService.getAppConfig()
            .subscribe((appConfig): void => {
                this.appConfig = appConfig;
            });
        this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
                this.venue = venue;
            });
    }

    // #region || SEARCH FILTERS
    /**
     * @description Update the selectedCategory property.
     * @param {Category} category - The category to filter by.
     * @memberof LocationService
     */
    public setCategoryFilter(category: Category): void {
        this.selectedCategory = category;
    }

    /**
     * @description Get the category used for filtering previously.
     * @returns {Category} - The category filtered by previously.
     * @memberof LocationService
     */
    public getCategoryFilter(): Category {
        return this.selectedCategory;
    }

    /**
     * @description Clear the selectedCategory property.
     * @memberof LocationService
     */
    public clearCategoryFilter(): void {
        this.selectedCategory = null;
    }

    /**
     * @description Update the searchQuery property.
     * @param {string} query - The query used for filtering.
     * @memberof LocationService
     */
    public setQueryFilter(query: string): void {
        this.searchQuery = query;
    }

    /**
     * @description Get the query used for filtering previously.
     * @returns {string}
     * @memberof LocationService
     */
    public getQueryFilter(): string {
        return this.searchQuery;
    }

    /**
     * @description Clear the searchQuery property.
     * @memberof LocationService
     */
    public clearQueryFilter(): void {
        this.searchQuery = null;
    }
    // #endregion

    // #region || LOCATION SET
    /**
     * @description Set location observable.
     * @param {string} locationId
     * @returns {Promise<void>}
     */
    setLocation(locationId: string): Promise<void> {
        return new Promise((resolve, reject): void => {
            this.mapsIndoorsService.isMapDirty = true;

            this.formatLocation(locationId)
                .then((location: Location): void => {
                    this.selectedLocation.next(location);

                    // Draw polygon
                    if (location.geometry.type.toLowerCase() === 'polygon') {
                        this.drawRoomPolygon(location);
                    }

                    // Don't update "return to *" btn if POI is outside selected venue
                    if (this.venue && this.venue.name === location.properties.venueId) {
                        this.mapsIndoorsService.setLocationAsReturnToValue(location, this.getAnchorCoordinates(location));
                        this.mapsIndoorsService.mapsIndoors.location = location; // Used for a check for the "Return to *" button
                    }

                    const anchorPoint = this.getAnchorCoordinates(location);

                    // Fit location inside map view with specified padding
                    const bounds = new google.maps.LatLngBounds(anchorPoint, anchorPoint);
                    const padding = 200;
                    this.googleMapService.googleMap.panToBounds(bounds, padding);

                    // Populate and open info window
                    this.googleMapService.updateInfoWindow(location.properties.name, anchorPoint);
                    this.googleMapService.openInfoWindow();

                    // Set floor
                    this.mapsIndoorsService.setFloor(location.properties.floor);
                    this.mapsIndoorsService.showFloorSelector();

                    resolve();
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    }

    drawRoomPolygon(location) {
        const coordinates = [];
        for (const coords of location.geometry.coordinates[0]) {
            coordinates.push({ lat: coords[1], lng: coords[0] });
        }
        // Update polygon
        if (this.polygon) {
            this.polygon.setPath(coordinates);
            this.polygon.setMap(this.googleMapService.googleMap);
        } else {
            this.polygon = new google.maps.Polygon({
                paths: coordinates,
                strokeColor: '#43aaa0',
                strokeOpacity: 1,
                strokeWeight: 1,
                fillColor: '#43aaa0',
                fillOpacity: 0.2
            });
            this.polygon.setMap(this.googleMapService.googleMap);
        }
    }

    /**
     * @description Get location formatted and fully populated with missing details.
     * @private
     * @param {string} locationId
     * @returns {Promise<Location>}
     */
    private formatLocation(locationId: string): Promise<Location> {
        // Requesting the location to receive a fully populated location object.
        return this.getLocationById(locationId)
            .then((location: Location) => {
                // Check if there are a image else set venue image
                if (!location.properties.imageURL || location.properties.imageURL.length <= 0) {
                    const config = this.appConfig;
                    for (const venueName in config.venueImages) {
                        if (location.properties.venueId.toLowerCase() === venueName.toLowerCase()) {
                            location.properties.imageURL = config.venueImages[location.properties.venueId.toLowerCase()];
                        }
                    }
                }

                // Adds http in front of any URL missing it
                if (location.properties.fields && location.properties.fields.website && location.properties.fields.website.value) {
                    const pattern = /^https?:\/\//;
                    if (!pattern.test(location.properties.fields.website.value)) {
                        location.properties.fields.website.value = 'http://' + location.properties.fields.website.value;
                    }
                }

                return location;
            });
    }

    // #endregion

    // #region || LOCATION GET
    getCurrentLocation(): Observable<any> {
        return this.selectedLocation.asObservable();
    }

    // Get by ID
    /**
     * @description Get a location by it's id.
     * @param {string} locationId Id of the location.
     * @returns {(Promise<Location>)} Returns the location.
     * @memberof LocationService
     */
    getLocationById(locationId: string): Promise<Location> {
        return new Promise((resolve, reject): void => {
            mapsindoors.LocationsService.getLocation(locationId)
                .then((location: Location): void => {
                    location.properties.categories = Object.values(location.properties.categories);
                    resolve(location);
                })
                .catch((err: Error): void => {
                    err.message = this.translateService.instant('Error.IncorrectLocation') as string;
                    reject(err);
                });
        });
    }

    /**
     * @description Get a location by it's external id.
     * @param {string} externalId - External id of the location.
     * @returns {Promise} - Resolves a location.
     * @memberof LocationService
     */
    getLocationByExternalId(externalId: string): Promise<Location> {
        return new Promise((resolve, reject): void => {
            this.searchService.getLocations({ q: externalId, fields: 'externalid' })
                .then((locations: Location[]): void => {
                    const location = locations.find((location: Location): boolean =>
                        location.properties.externalId === externalId
                        && location.properties.venue === this.venue.venueInfo.name
                    );
                    if (location) {
                        resolve(location);
                    } else {
                        reject(new Error(this.translateService.instant('Error.IncorrectLocation') as string));
                    }
                });
        });
    }
    // #endregion

    // #region || CLUSTERED LOCATIONS
    setClusteredLocations(locations: Location[]) {
        this.searchService.setIcons(locations)
            .then((updatedLocations: Location[]) => this.clusteredLocations.next(updatedLocations));
    }

    getClusteredLocations(): Observable<Location[]> {
        return this.clusteredLocations.asObservable();
    }

    clearClusteredLocations() {
        this.clusteredLocations.next([]);
    }
    // #endregion

    // #region || HELPERS

    /**
     * @description Get anchor point for location type polygon or point.
     * @param {Location} location
     * @returns {google.maps.LatLng} - The anchor point.
     * @memberof LocationService
     */
    public getAnchorCoordinates(location: Location): google.maps.LatLng {
        return location.geometry.type.toLowerCase() === 'point' ?
            new google.maps.LatLng(location.geometry.coordinates[1], location.geometry.coordinates[0]) :
            new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]);
    }
    // #endregion
}
