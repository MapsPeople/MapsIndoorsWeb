import { Observable, ReplaySubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { GoogleMapService } from './google-map.service';
import { Injectable } from '@angular/core';
import { MapsIndoorsService, FitSelectionInfo } from './maps-indoors.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';
import { TranslateService } from '@ngx-translate/core';

import { Category, Location, LocationType, Venue } from '@mapsindoors/typescript-interfaces';
import { Point } from 'geojson';
import { SolutionService } from './solution.service';
import { UserPosition } from '../directions/components/user-position/user-position.component';
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
        strokeWeight: 2,
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
        private solutionService: SolutionService
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

    /**
     * Update the selectedCategory property.
     *
     * @param {Category} category - The category to filter by.
     */
    public setCategoryFilter(category: Category): void {
        this.selectedCategory = category;
    }

    /**
     * Get the category used for filtering previously.
     *
     * @returns {Category} - The category filtered by previously.
     */
    public getCategoryFilter(): Category {
        return this.selectedCategory;
    }

    /**
     * Clear the selectedCategory property.
     */
    public clearCategoryFilter(): void {
        this.selectedCategory = null;
    }

    /**
     * Update the searchQuery property.
     *
     * @param {string} query - The query used for filtering.
     */
    public setQueryFilter(query: string): void {
        this.searchQuery = query;
    }

    /**
     * Get the query used for filtering previously.
     *
     * @returns {string}
     */
    public getQueryFilter(): string {
        return this.searchQuery;
    }

    /**
     * Clear the searchQuery property.
     */
    public clearQueryFilter(): void {
        this.searchQuery = null;
    }

    /**
     * Set location observable.
     *
     * @param {Location} location
     * @returns {Promise<void>}
     */
    setLocation(location: Location): void {
        this.mapsIndoorsService.isMapDirty = true;

        const formattedLocation = this.getFormattedLocation(location);
        this.selectedLocation.next(formattedLocation);

        // Remove previous highlight
        this.clearLocationPolygonHighlight();

        // Highlight polygon
        if (formattedLocation.geometry.type.toLowerCase() === 'polygon') {
            this.highlightLocationPolygon(formattedLocation.id);
        }

        const locationAnchorPoint = this.getAnchorCoordinates(formattedLocation);

        // Don't update "return to *" btn if POI is outside selected venue
        if (this.venue && this.venue.name === formattedLocation.properties.venueId) {
            const currentSelectionInfo: FitSelectionInfo = {
                name: formattedLocation.properties.name,
                coordinates: locationAnchorPoint,
                isVenue: false
            };
            this.mapsIndoorsService.setFitSelectionInfo(currentSelectionInfo);

            this.mapsIndoorsService.mapsIndoors.location = formattedLocation; // Used for a check for the "Return to *" button
        }

        // Fit location inside map view with specified padding
        // The Google Maps support for fitting a location with padding is limited which is why panToBounds method is used to make sure that the locations anchor coordinate is fitted nicely in the view
        const padding = 200;
        const bounds = new google.maps.LatLngBounds(locationAnchorPoint, locationAnchorPoint);
        this.googleMapService.map.panToBounds(bounds, padding);

        // Populate and open info window
        this.googleMapService.updateInfoWindow(formattedLocation.properties.name, locationAnchorPoint);
        this.googleMapService.openInfoWindow();

        // Set floor
        this.mapsIndoorsService.setFloor(formattedLocation.properties.floor);
        this.mapsIndoorsService.showFloorSelector();
    }

    /**
     * Highlight a MapsIndoors Location Polygon. Only one polygon can be highlighted at a time.
     *
     * @param {string} locationId
     * @returns {void}
     */
    public highlightLocationPolygon(locationId: string): void {
        this.mapsIndoorsService.mapsIndoors.setDisplayRule(locationId, {
            visible: true,
            zoomFrom: 0,
            zoomTo: 22,
            zIndex: 1000,
            polygonFillColor: this.polygonHighlightOptions.fillColor,
            polygonFillOpacity: this.polygonHighlightOptions.fillOpacity,
            polygonStrokeColor: this.polygonHighlightOptions.strokeColor,
            polygonStrokeOpacity: this.polygonHighlightOptions.strokeOpacity,
            polygonStrokeWeight: this.polygonHighlightOptions.strokeWeight,
            polygonVisible: true
        });
        this.highlightedLocationId = locationId;
    }

    /**
     * Clear existing MapsIndoors location polygon highlight.
     */
    public clearLocationPolygonHighlight(): void {
        if (this.highlightedLocationId) {
            this.mapsIndoorsService.mapsIndoors.setDisplayRule(this.highlightedLocationId, null);
            this.highlightedLocationId = null;
        }
    }

    /**
     * Get formatted location where imageURL defaults to venue image if undefined and update the website value property pattern.
     *
     * @private
     * @param {Location} location
     * @returns {Location}
     */
    private getFormattedLocation(location: Location): Location {
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

    /**
     * Get current Location.
     *
     * @returns {Observable<Location>}
     */
    public getCurrentLocation(): Observable<Location> {
        return this.selectedLocation.asObservable();
    }

    /**
     * Get location by id.
     *
     * @param {string} locationId
     * @returns {Promise<Location>}
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
     * Get location by external id.
     *
     * @param {string} externalId - External id of the location.
     * @returns {Promise} - Resolves a location.
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

    /**
     * Get icon URL for location.
     *
     * @param {Location} location
     * @param {LocationType[]} locationTypes
     * @returns {string}
     */
    getLocationIconUrl(location: Location, locationTypes: LocationType[]): string {
        // Location icon
        if (location?.properties?.displayRule?.icon instanceof HTMLImageElement) {
            return location.properties.displayRule.icon.src;
        } else if (location?.properties?.displayRule?.icon > '') {
            return location?.properties?.displayRule?.icon;
        }

        // Location type icon
        const locationType = locationTypes.find((locationType): boolean => locationType.name.toLowerCase() === location.properties.type.toLowerCase());
        if (locationType) {
            return locationType.icon;
        }

        // Google default icon
        if (location.properties.type === 'google_places') {
            return './assets/images/icons/google-poi.png';
        }

        // Default icon
        const appDefaultLocationIcon = '/assets/images/icons/noicon.png';
        const defaultLocationType = locationTypes.find((type): boolean => type.name.toLowerCase() === 'unknown');
        return defaultLocationType?.icon || appDefaultLocationIcon;
    }

    /**
     * Get location anchor coordinates.
     *
     * @param {(Location | UserPosition)} location
     * @returns {google.maps.LatLng}
     */
    public getAnchorCoordinates(location: Location | UserPosition): google.maps.LatLng {
        // UserPosition
        if ((<UserPosition>location).geometry.coords?.latitude) {
            return new google.maps.LatLng((<UserPosition>location).geometry.coords.latitude, (<UserPosition>location).geometry.coords.longitude);
        }

        if ((<Location>location).geometry.type.toLowerCase() === 'point') {
            const geometry = location.geometry as Point;
            return new google.maps.LatLng(geometry.coordinates[1], geometry.coordinates[0]);
        }

        return new google.maps.LatLng((<Location>location).properties.anchor.coordinates[1], (<Location>location).properties.anchor.coordinates[0]);
    }
}
