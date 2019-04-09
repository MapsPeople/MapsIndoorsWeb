import { Injectable } from '@angular/core';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from './app-config.service';
import { MapsIndoorsService } from './maps-indoors.service';
import { GoogleMapService } from './google-map.service';
import { Observable, Subject } from 'rxjs';
import { VenueService } from './venue.service';

declare var mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class LocationService {

	locationService = mapsindoors.LocationsService
	routeState: boolean = false;
	// Used for restoring page when going back search page
	searchQuery: string = "";
	searchCategory: any;

	gmIdleListener: any;
	private selectedLocation = new Subject<any>();

	constructor(
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
		private venueService: VenueService,

	) { }

	// #region || GET LOCATIONS
	async getLocations(parameters) {
		var locations = await this.locationService.getLocations(parameters);
		// Set type icon
		let types = await this.solutionService.getSolutionTypes()
		let unknownType = types.filter(type => {
			return type.name === "Unknown"
		})
		for (let location of locations) {

			// If there are a advanced icon 
			if (location.properties.displayRule && location.properties.displayRule.icon && location.properties.displayRule.icon.length > 0) {
				location.properties.iconUrl = location.properties.displayRule.icon;
			}
			else {
				// If location type match a type then set type icon
				for (let type of types) {
					if (location.properties.type.toLowerCase() === type.name.toLowerCase()) {
						location.properties.iconUrl = type.icon
					}
				}
				// If no icon then set standard icon
				if (!location.properties.iconUrl || location.properties.iconUrl == "" || location.properties.iconUrl.includes("transparent" || "noicon")) {
					location.properties.iconUrl = unknownType[0].icon;
				}
			}
		}
		return locations
	}
	// #endregion

	// #region || GET LOCATIONS BY ID
	async getLocationById(locationId) {
		let location = await this.locationService.getLocation(locationId)
		await this.formatLocation(location);

		return location
	}
	// #endregion

	// #region || SET LOCATION
	async setLocation(location) {
		return new Promise(async (resolve, reject) => {
			const gmCenterStart = await this.googleMapService.googleMap.getCenter();
			const gmCenterStartLagLng = gmCenterStart.lat() + gmCenterStart.lng();

			this.mapsIndoorsService.isMapDirty = true;

			// Set zoom level
			if (this.googleMapService.googleMap.getZoom() < 19) {
				this.googleMapService.googleMap.setZoom(19)
			}

			await this.formatLocation(location);

			// Used for return to "something" button
			const center = location.properties.anchor ?
				// For new poi objects
				[].concat(location.properties.anchor.coordinates).reverse() :
				// For old poi objects
				[].concat(location.geometry.coordinates).reverse();

			// Don't update "return to *" btn if POI is outside selected venue
			if (this.venueService.venue.name == location.properties.venueId) {
				this.mapsIndoorsService.setReturnToValues(location.properties.name, center, false);
				this.mapsIndoorsService.mapsIndoors.location = location; // Used for a check for the "Return to *" button 
			}

			// Set floor
			// NOTE: Removing previous listener to avoid triggering it multiple times if idle hasn't been fired for previous location
			if (this.gmIdleListener) await this.gmIdleListener.remove();
			this.gmIdleListener = google.maps.event.addListenerOnce(this.googleMapService.googleMap, 'idle', () => {
				this.mapsIndoorsService.mapsIndoors.setFloor(location.properties.floor);
			});

			// For observables
			this.selectedLocation.next(location);

			// Set info window			
			let content = '<div class="infowindow text-link">' + location.properties.name + '</div>';
			this.googleMapService.infoWindow.setContent(content)
			// Check if it's a new poi object
			if (location.properties.anchor) {
				// Set center
				this.googleMapService.googleMap.setCenter({
					lat: location.properties.anchor.coordinates[1],
					lng: location.properties.anchor.coordinates[0]
				})

				this.googleMapService.infoWindow.setPosition(new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]));
			}
			// For old poi objects
			else {
				// Set center
				this.googleMapService.googleMap.setCenter({
					lat: location.geometry.coordinates[1],
					lng: location.geometry.coordinates[0]
				})

				this.googleMapService.infoWindow.setPosition(new google.maps.LatLng(location.geometry.coordinates[1], location.geometry.coordinates[0]));
			}
			this.googleMapService.infoWindow.open(this.googleMapService.googleMap);

			// Workaround: If idle isn't triggered then setFloor() anyways
			const gmCenterEnd = await this.googleMapService.googleMap.getCenter();
			const gmCenterEndLagLng = gmCenterEnd.lat() + gmCenterEnd.lng();
			if (gmCenterStartLagLng == gmCenterEndLagLng) this.mapsIndoorsService.mapsIndoors.setFloor(location.properties.floor);

			resolve();
		})
	}
	// #endregion

	// #region || CLEAR SELECTED LOCATION
	clearLocation() {
		this.selectedLocation.next();
	}
	// #endregion 

	// #region || FORMAT LOCATION
	async formatLocation(location) {
		// Check if there are a image else set venue image
		if (!location.properties.imageURL || location.properties.imageURL.length <= 0) {
			let config = await this.appConfigService.appConfig;
			for (let venueName in config.venueImages) {
				if (location.properties.venueId.toLowerCase() == venueName.toLowerCase()) {
					location.properties.imageURL = config.venueImages[location.properties.venueId.toLowerCase()];
				}
			}
		}

		// NOTE: Not sure what this do?
		if (location.properties.fields && location.properties.fields.website && location.properties.fields.website.value) {
			let pattern = /^https?:\/\//;
			if (!pattern.test(location.properties.fields.website.value)) {
				location.properties.fields.website.value = 'http://' + location.properties.fields.website.value;
			}
		}

		// Set category
		let categories = Object.keys(location.properties.categories);
		if (categories && categories.length > 0) {
			location.properties.category = location.properties.categories[categories[0]];
		}

		// NOTE: I do this because I can't expect the locations venue and building to be readable for the end user
		this.venueService.getVenues().then(venues => {
			for (let venue of venues) {
				if (venue.name == location.properties.venueId) {
					location.properties.venueName = venue.venueInfo.name;
				}
			}
		})
		// Not all POI's is inside an building
		if (location.buildingId) {
			this.venueService.getBuildingById(location.buildingId).then(building => {
				location.properties.buildingName = building.buildingInfo.name
			});
		}
		return location
	}
	// #endregion

	// #region || GET CURRENT LOCATION
	getCurrentLocation(): Observable<any> {
		return this.selectedLocation.asObservable();
	}
	// #endregion

}
