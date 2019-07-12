import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { GoogleMapService } from './google-map.service';
import { Injectable } from '@angular/core';
import { MapsIndoorsService } from './maps-indoors.service';
import { SolutionService } from '../services/solution.service';
import { VenueService } from './venue.service';

declare const mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class LocationService {

	miLocationService = mapsindoors.LocationsService;
	routeState: boolean = false;
	appConfig: any;
	// Used for restoring page when going back search page
	searchQuery: string = "";
	selectedCategory: any;
	gmIdleListener: any;

	private selectedLocation = new Subject<any>();
	polygon: google.maps.Polygon;

	private clusteredLocations = new BehaviorSubject<any>([]);

	constructor(
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
		private venueService: VenueService,
	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
	}

	// #region || CATEGORY
	setCategory(category) {
		this.selectedCategory = category;
	}

	getCategory() {
		return new Promise((resolve, reject) => this.selectedCategory ? resolve(this.selectedCategory) : reject);
	}

	clearCategory() {
		this.selectedCategory = null;
	}
	// #endregion

	// #region || LOCATION SET
	setLocation(loc) {
		return new Promise(async (resolve, reject) => {
			const gmCenterStart = await this.googleMapService.googleMap.getCenter();
			const gmCenterStartLagLng = gmCenterStart.lat() + gmCenterStart.lng();

			this.mapsIndoorsService.isMapDirty = true;

			this.formatLocation(loc)
				.then(async (location) => {
					// Draw polygon
					if (location.geometry) this.drawRoomPolygon(location);

					const anchor = new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]);

					// Don't update "return to *" btn if POI is outside selected venue
					if (this.venueService.venue.name === location.properties.venueId) {
						this.mapsIndoorsService.setReturnToValues(location.properties.name, anchor, false);
						this.mapsIndoorsService.mapsIndoors.location = location; // Used for a check for the "Return to *" button
					}

					// NOTE: Removing previous listener to avoid triggering it multiple times if idle hasn't been fired for previous location
					if (this.gmIdleListener) await this.gmIdleListener.remove();
					// Set floor
					this.gmIdleListener = google.maps.event.addListenerOnce(this.googleMapService.googleMap, 'idle', () => {
						this.mapsIndoorsService.mapsIndoors.setFloor(location.properties.floor);
					});

					// For observables
					this.selectedLocation.next(location);

					// Set center
					if (this.googleMapService.googleMap.getZoom() < 19) this.googleMapService.googleMap.panTo(anchor);

					// Populate info-window
					const content = '<div class="infowindow text-link">' + location.properties.name + '</div>';
					this.googleMapService.infoWindow.setContent(content);
					this.googleMapService.infoWindow.setPosition(anchor);

					// Set gm zoom level
					if (this.googleMapService.googleMap.getZoom() < 19) this.googleMapService.googleMap.setZoom(19);

					// Open info-window
					this.googleMapService.infoWindow.open(this.googleMapService.googleMap);

					// Workaround: If idle isn't triggered then setFloor() anyways
					const gmCenterEnd = await this.googleMapService.googleMap.getCenter();
					const gmCenterEndLagLng = gmCenterEnd.lat() + gmCenterEnd.lng();
					if (gmCenterStartLagLng === gmCenterEndLagLng) this.mapsIndoorsService.mapsIndoors.setFloor(location.properties.floor);

					resolve();
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
		// NOTE: Clicking a POI returns a different object than when clicking a room, to prevent that =>
		if (!loc.geometry.bbox) await this.getLocationById(loc.id).then((l) => location = l);
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
	getLocationById(locationId) {
		return new Promise(async (resolve, reject) => {
			const location = await this.miLocationService.getLocation(locationId);
			resolve(location);
		});
	}
	// #endregion

	// #region || LOCATION CLEAR
	clearLocation() {
		this.selectedLocation.next();
	}
	// #endregion

	// #region || CLUSTERED LOCATIONS
	setClusteredLocations(locations) {
		this.setIcons(locations).then((populatedLocations) => this.clusteredLocations.next(populatedLocations));
	}

	getClusteredLocations(): Observable<any> {
		return this.clusteredLocations.asObservable();
	}

	clearClusteredLocations() {
		this.clusteredLocations.next([]);
	}
	// #endregion

	// #region || LOCATIONS GET
	getLocations(parameters) {
		return new Promise(async (resolve, reject) => {
			const l: any[] = await this.miLocationService.getLocations(parameters);
			this.setIcons(l)
				.then((locations: any[]) => resolve(locations));
		});
	}
	// #endregion

	setIcons(locations) {
		return new Promise(async (resolve, reject) => {
			const populatedLocations: any[] = [];
			// Set type icon
			const types = await this.solutionService.getSolutionTypes();
			const unknownType = types.filter((type) => {
				return type.name === "Unknown";
			});

			for (const location of locations) {
				// If there are a advanced icon
				if (location.properties.displayRule && location.properties.displayRule.icon && location.properties.displayRule.icon.length > 0) {
					location.properties.iconUrl = location.properties.displayRule.icon;
				}
				else {
					// If location type match a type then set type icon
					for (const type of types) {
						if (location.properties.type.toLowerCase() === type.name.toLowerCase()) {
							location.properties.iconUrl = type.icon;
						}
					}
					// If no icon then set standard icon
					//TODO: At some point update POI's and remove transparent and no icon check
					if (!location.properties.iconUrl || location.properties.iconUrl === "" || location.properties.iconUrl.includes("transparent" || "noicon")) {
						location.properties.iconUrl = unknownType[0].icon;
					}
				}
				populatedLocations.push(location);
			}
			resolve(populatedLocations);
		});
	}
}
