import { Observable, ReplaySubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { GoogleMapService } from './google-map.service';
import { Injectable } from '@angular/core';
import { MapsIndoorsService } from './maps-indoors.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';
import { TranslateService } from '@ngx-translate/core';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { BaseLocation } from '../shared/models/baseLocation.interface';
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
    private polygonHighlightOptions = {
        strokeColor: '#EF6CCE',
        strokeOpacity: 1,
        strokeWeight: 1,
        fillColor: '#EF6CCE',
        fillOpacity: 0.2
    };
    private highlightedLocationId: string;

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
     * @param {Location} location
     * @returns {Promise<void>}
     */
    setLocation(location: Location): void {
        this.mapsIndoorsService.isMapDirty = true;

        const formatedLocation = this.formatLocation(location);
        this.selectedLocation.next(formatedLocation);

        // Remove previous highlight
        this.clearLocationPolygonHighlight();

        // Highlight polygon
        if (formatedLocation.geometry.type.toLowerCase() === 'polygon') {
            this.highlightLocationPolygon(formatedLocation.id);
        }

        // Don't update "return to *" btn if POI is outside selected venue
        if (this.venue && this.venue.name === formatedLocation.properties.venueId) {
            this.mapsIndoorsService.setLocationAsReturnToValue(formatedLocation, this.getAnchorCoordinates(formatedLocation));
            this.mapsIndoorsService.mapsIndoors.location = formatedLocation; // Used for a check for the "Return to *" button
        }

        const anchorPoint = this.getAnchorCoordinates(formatedLocation);

        // Fit location inside map view with specified padding
        const bounds = new google.maps.LatLngBounds(anchorPoint, anchorPoint);
        const padding = 200;
        this.googleMapService.map.panToBounds(bounds, padding);

        // Populate and open info window
        this.googleMapService.updateInfoWindow(formatedLocation.properties.name, anchorPoint);
        this.googleMapService.openInfoWindow();

        // Set floor
        this.mapsIndoorsService.setFloor(formatedLocation.properties.floor);
        this.mapsIndoorsService.showFloorSelector();
    }

    /**
     * Highlight a MapsIndoors Location Polygon. Only one polygon can be highlighted at a time.
     * @param {string} locationId
     * @returns {void}
     * @memberof LocationService
     */
    public highlightLocationPolygon(locationId: string): void {
        // DISCLAIMER: The fillColor, fillOpacity, strokeColor, strokeOpacity, and strokeWeight properties are not an official part of the Display Rules interface and may be subject to change without further notice
        this.mapsIndoorsService.mapsIndoors.setDisplayRule(locationId, {
            visible: true,
            zoomFrom: '0',
            zoomTo: '22',
            zIndex: 1000,
            fillColor: this.polygonHighlightOptions.fillColor,
            fillOpacity: this.polygonHighlightOptions.fillOpacity,
            strokeColor: this.polygonHighlightOptions.strokeColor,
            strokeOpacity: this.polygonHighlightOptions.strokeOpacity,
            strokeWeight: this.polygonHighlightOptions.strokeWeight
        });
        this.highlightedLocationId = locationId;
    }

    /**
     * Clear existing MapsIndoors location polygon highlight.
     * @memberof LocationService
     */
    public clearLocationPolygonHighlight(): void {
        if (this.highlightedLocationId) {
            this.mapsIndoorsService.mapsIndoors.setDisplayRule(this.highlightedLocationId, null);
            this.highlightedLocationId = null;
        }
    }

    /**
     * @description Get location formatted and fully populated with missing details.
     * @private
     * @param {Location} location
     * @returns {Location}
     */
    private formatLocation(location: Location): Location {
        // Check if the location has an image else set venue image
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
    }

    // #endregion

    // #region || LOCATION GET
    public getCurrentLocation(): Observable<Location> {
        return this.selectedLocation.asObservable();
    }

    // Get by ID
    /**
     * @description Get a location by it's id.
     * @param {string} locationId Id of the location.
     * @returns {(Promise<Location>)} Returns the location.
     * @memberof LocationService
     */
    public getLocationById(locationId: string): Promise<Location> {
        return new Promise((resolve, reject): void => {
            mapsindoors.services.LocationsService.getLocation(locationId)
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
    public getLocationByExternalId(externalId: string): Promise<Location> {
        return new Promise((resolve, reject): void => {
            this.searchService.getLocations({ q: externalId, fields: 'externalId' })
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

    // #region || HELPERS

    /**
     * @description Get anchor point for location type polygon or point.
     * @param {Location} location
     * @returns {google.maps.LatLng} - The anchor point.
     * @memberof LocationService
     */
    public getAnchorCoordinates(location: BaseLocation): google.maps.LatLng {
        return location.geometry.type.toLowerCase() === 'point' ?
            new google.maps.LatLng(location.geometry.coordinates[1], location.geometry.coordinates[0]) :
            new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]);
    }
    // #endregion
}
