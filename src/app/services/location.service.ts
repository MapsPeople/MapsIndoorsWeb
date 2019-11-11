import { Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { GoogleMapService } from './google-map.service';
import { Injectable } from '@angular/core';
import { MapsIndoorsService } from './maps-indoors.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';

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
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
		private venueService: VenueService,
		private searchService: SearchService

	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.venueService.getVenueObservable()
			.subscribe((venue: Venue) => {
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
	setLocation(loc) {
		return new Promise((resolve, reject) => {
			this.mapsIndoorsService.isMapDirty = true;

			this.formatLocation(loc)
				.then((location) => {
					this.selectedLocation.next(location);

					// Draw polygon
					if (location.geometry) this.drawRoomPolygon(location);

					const anchor = new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]);

					// Don't update "return to *" btn if POI is outside selected venue
					if (this.venue && this.venue.name === location.properties.venueId) {
						this.mapsIndoorsService.setLocationAsReturnToValue(location);
						this.mapsIndoorsService.mapsIndoors.location = location; // Used for a check for the "Return to *" button
					}

					// Set center
					if (this.googleMapService.googleMap.getZoom() < 19) this.googleMapService.googleMap.panTo(anchor);

					// Set Google Maps zoom level
					if (this.googleMapService.googleMap.getZoom() < 19) this.googleMapService.googleMap.setZoom(19);

					// Populate and open info window
					this.googleMapService.updateInfoWindow(location.properties.name, anchor);
					this.googleMapService.openInfoWindow();

					// Set floor
					this.mapsIndoorsService.setFloor(location.properties.floor);

					resolve();
				})
				.catch(() => {
					// TODO: Send a more detailed reason for promise to fail.
					reject('An error occurred, please try again later.');
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
		}
		else {
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

	async formatLocation(loc) {
		let location: any;
		// If loc is a point then request the location to get the room coordinates as well.
		// OBS: Only newer solutions have room coordinates and the request is therefor not making a difference for older solutions.
		if (loc.geometry.type === 'Point') {
			await this.getLocationById(loc.id)
				.then((l) => location = l);
		}
		else location = loc;

		// Check if there are a image else set venue image
		if (!location.properties.imageURL || location.properties.imageURL.length <= 0) {
			const config = await this.appConfig;
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

		// Set category
		const categories = Object.keys(location.properties.categories);
		if (categories && categories.length > 0) {
			location.properties.category = location.properties.categories[categories[0]];
		}

		// Set anchor-point
		// NOTE: Support for old POI-objects
		if (!location.properties.anchor) {
			location.properties.anchor = location.geometry;
			location.geometry = null;
		}

		// NOTE: I do this because I can't expect the locations venue and building to be readable for the end user
		this.venueService.getVenues().then((venues) => {
			for (const venue of venues) {
				if (venue.name === location.properties.venueId) {
					location.properties.venueName = venue.venueInfo.name;
				}
			}
		});
		// Not all POI's is inside an building
		if (location.buildingId) {
			this.venueService.getBuildingById(location.buildingId).then((building) => {
				location.properties.buildingName = building.buildingInfo.name;
			});
		}
		return location;
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
	 * @returns {Promise} Returns a location.
	 * @memberof LocationService
	 */
	getLocationById(locationId: string) {
		return mapsindoors.LocationsService.getLocation(locationId);
	}

	/**
	 * @description Get a location by it's Room id.
	 * @param {string} roomId - Room id of the location.
	 * @returns {Promise} - Resolves a location.
	 * @memberof LocationService
	 */
	getLocationByRoomId(roomId: string) {
		return new Promise((resolve, reject) => {
			this.searchService.getLocations({ roomId: roomId })
				.then((locations: Location[]) => {
					const location = locations.find((location: Location) =>
						location.properties.roomId === roomId
						&& location.properties.venue === this.venue.venueInfo.name
					);
					if (location) resolve(location);
					else reject('No location found');
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
}
