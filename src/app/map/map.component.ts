import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { GoogleMapService } from './../services/google-map.service';
import { MapsIndoorsService } from './../services/maps-indoors.service';
import { LocationService } from './../services/location.service';
import { ThemeService } from './../services/theme.service';
import { DirectionService } from './../services/direction.service';
import { VenueService } from './../services/venue.service';
import { SolutionService } from './../services/solution.service';
import { AppConfigService } from './../services/app-config.service';
import { UserAgentService } from './../services/user-agent.service';
import { Subscription } from 'rxjs';

import { Venue } from '../shared/models/venue.interface';

declare const ga: Function;

@Component({
	selector: 'app-root',
	templateUrl: './map.component.html',
	styleUrls: ['./map.component.scss']
})

export class MapComponent {
	isInternetExplorer: boolean;
	isHandset: boolean;
	statusOk: boolean = false;
	appConfig: any;
	colors: object;
	loading: boolean = false;
	venue: Venue;
	returnToValues: any;
	pageTitle: string;
	location: any;
	returnBtn: HTMLElement;

	isHandsetSubscription: Subscription;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private userAgentService: UserAgentService,
		private googleMapService: GoogleMapService,
		private mapsIndoorsService: MapsIndoorsService,
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private locationService: LocationService,
		private themeService: ThemeService,
		public directionService: DirectionService,
		private venueService: VenueService,
		private activatedRoute: ActivatedRoute
	) {
		// Observables
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		this.venueService.getVenueObservable().subscribe((venue: Venue) => {
			if (venue && venue.id) {
				this.venue = venue;
				this.returnTo();
			}
		});
		this.locationService.getCurrentLocation().subscribe((location) => this.location = location);
		this.mapsIndoorsService.getCurrentPageTitle().subscribe((title) => this.pageTitle = title);
		this.isHandsetSubscription = this.userAgentService.isHandset()
			.subscribe((value: boolean) => this.isHandset = value);
	}

	async ngOnInit() {
		this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
		this.initAnalyticsPageView();
		await this.googleMapService.initMap();
		await this.mapsIndoorsService.initMapsIndoors();
		this.activatedRoute.firstChild.params.subscribe(async (params) => {
			if (params.venueId) {
				const venue = await this.venueService.getVenueById(params.venueId);
				await this.venueService.setVenue(venue, this.appConfig);
				this.mapsIndoorsService.floorSelector(true);
			}
		});
		await this.themeService.setColors();
		this.solutionService.setSolutionName();
		this.returnToValues = await this.mapsIndoorsService.getReturnToValues();
		this.addLocationListener();
		this.addFloorChangedListener();
		this.returnBtn = document.getElementById('return-to-venue');
		this.statusOk = true;
	}

	/**
	 * @description Sends a pageview to Google Analytics after each navigation-end event
	 */
	private initAnalyticsPageView() {
		this.router.events.subscribe((event) => {
			if (event instanceof NavigationEnd) {
				ga('set', 'page', event.urlAfterRedirects);
				ga('send', 'pageview');
				if (this.appConfig && this.appConfig.appSettings.gaKey) ga('clientTracker.send', 'pageview');
			}
		});
	}

	// #region || CLEAR MAP
	async clearMap() {
		// this.mapsIndoorsService.mapsIndoors.fitVenue();
		this.googleMapService.infoWindow.close();
		this.locationService.searchQuery = "";
		this.locationService.clearCategory();
		this.mapsIndoorsService.setPageTitle();
		const solutionName = await this.solutionService.getSolutionName();
		this.router.navigate([`${solutionName}/${this.venue.id}/search`]);

		// Used for return to Venue or POI button
		const center = await [].concat(this.venue.anchor.coordinates).reverse();
		this.mapsIndoorsService.setReturnToValues(this.venue.venueInfo.name, center, true);

		this.mapsIndoorsService.isMapDirty = false;
		// Google Analytics
		ga('send', 'event', 'Map', 'Clear map button click', 'Clear map button was clicked');
	}
	// #endregion

	// #region || LISTENER || RETURN TO VENUE OR POI
	/**
	 * @description Adds a Google Maps Idle and Return To button click listener.
	 * @listens event:click Returns to previous selected venue or location when clicked.
	 * @listens event:idle Shows or hides button when panning the map.
	 */
	returnTo() {
		const googleMap = this.googleMapService.googleMap;
		const mapsIndoors = this.mapsIndoorsService.mapsIndoors;

		// Return to venue button click listener
		const containerListener = google.maps.event.addDomListener(this.returnBtn, 'click', () => {
			if (this.returnToValues.venue === true) mapsIndoors.fitVenue();
			else this.googleMapService.googleMap.panTo(this.returnToValues.latLng);
		});

		// TODO: Add listener once?
		// Fires when panning around on googleMap object
		const panListener = google.maps.event.addListener(googleMap, 'idle', () => {
			// Checking if venue is inside googleMap bounds
			if (mapsIndoors) {
				const googleBounds = googleMap.getBounds();
				// Always true except for when getting a direction
				if (this.venueService.favouredVenue && this.venueService.returnBtnActive) {
					// Hide button
					if (googleBounds && googleBounds.intersects(this.venue.boundingBox)) {
						if (this.returnBtn.className.indexOf(' hidden') < 0) {
							this.returnBtn.className += ' hidden';
						}
					}
					// Show button
					else {
						this.returnBtn.className = this.returnBtn.className.replace(' hidden', '');
						google.maps.event.removeListener(containerListener);
					}
				}
			}
		});
	}
	//#endregion

	// #region || LISTENER || LOCATION CLICK
	/**
	 * Adding a listener for clicks on locations
	 * @listens event:click
	 */
	addLocationListener() {
		google.maps.event.addListener(this.mapsIndoorsService.mapsIndoors, 'click', (location) => {
			// Multiple locations (clustered locations)
			if (Array.isArray(location)) this.handleClusterClick(location);
			// A single location
			else this.handleSingleLocationClick(location);
		});
	}

	/**
	 * Fitting locations inside view if zoom-level is lower than 21 otherwise navigating to search page and listing locations.
	 * @param locations	The locations from the clicked cluster.
	 */
	async handleClusterClick(locations) {
		const gmZoom = await this.googleMapService.googleMap.getZoom();
		// Zoom if zoom-level is lower than 21
		if (gmZoom < 21) {
			const bounds = new google.maps.LatLngBounds;
			for (const l of locations) {
				if (l.properties.anchor) bounds.extend({ lat: l.properties.anchor[1], lng: l.properties.anchor[0] });
				else bounds.extend({ lat: l.geometry.coordinates[1], lng: l.geometry.coordinates[0] });
			}
			this.googleMapService.googleMap.fitBounds(bounds);
		}

		// If max zoom then go to search page and list clustered locations
		else {
			this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
			this.locationService.setClusteredLocations(location);
			// Google Analytics
			ga('send', 'event', 'Map', 'Cluster click', 'Clustered locations was clicked');
		}
	}

	/**
	 * Navigating to details page when a single location are clicked on the map.
	 * @param location	The clicked location.
	 */
	handleSingleLocationClick(location) {
		this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/details/${location.id}`]);
		this.locationService.setLocation(location);
		// Google Analytics
		ga('send', 'event', 'Map', 'Location click', `${location.properties.name} was clicked`);
	}
	// #endregion

	// #region || LISTENER || FLOOR CHANGED
	// Closes and opens info-windows when changing floors
	async addFloorChangedListener() {
		const mapsIndoors = await this.mapsIndoorsService.mapsIndoors;
		google.maps.event.addListener(mapsIndoors, 'floor_changed', () => {
			if (!this.locationService.routeState && this.location) {
				const locationFloor: string = this.location.properties.floor;
				if (locationFloor !== this.mapsIndoorsService.mapsIndoors.getFloor()) {
					// Close location info-window
					this.googleMapService.infoWindow.close();
					// Remove location polygon
					if (this.locationService.polygon) this.locationService.polygon.setMap(null);
				} else {
					// Open location info-window
					this.googleMapService.infoWindow.open(this.googleMapService.googleMap);
					// Set location polygon
					if (this.locationService.polygon) this.locationService.polygon.setMap(this.googleMapService.googleMap);
				}
			}
		});
	}
	// #endregion

}

