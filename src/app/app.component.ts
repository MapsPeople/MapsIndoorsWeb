import { Component, NgZone } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { GoogleMapService } from './services/google-map.service';
import { MapsIndoorsService } from './services/maps-indoors.service';
import { LocationService } from './services/location.service';
import { ThemeService } from './services/theme.service';
import { DirectionService } from './services/direction.service';
import { VenueService } from './services/venue.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { SolutionService } from './services/solution.service';
import { AppConfigService } from './services/app-config.service';

declare const ga: Function;

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})

export class AppComponent {
	ie11: boolean = false;
	isHandset: any;
	statusOk: boolean = false;
	appConfig: any;
	colors: object;
	loading: boolean = false;
	venue: any;
	venueBoundingBox: any;
	returnToValues: any;
	pageTitle: string;
	location: any;

	constructor(
		private breakpointObserver: BreakpointObserver,
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private translate: TranslateService,
		private googleMapService: GoogleMapService,
		private mapsIndoorsService: MapsIndoorsService,
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private locationService: LocationService,
		private themeService: ThemeService,
		public directionService: DirectionService,
		private venueService: VenueService
	) {
		// Workaround to get correct vh across different browsers
		const vh = window.innerHeight;
		document.body.style.setProperty('height', `${vh}px`);
		window.addEventListener('resize', () => {
			const vh = window.innerHeight;
			document.body.style.setProperty('height', `${vh}px`);
		});

		// Set default language
		translate.setDefaultLang('en');

		// Observables
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		this.venueService.getVenueObservable().subscribe((venue) => this.venue = venue);
		this.locationService.getCurrentLocation().subscribe((location) => this.location = location);
		this.mapsIndoorsService.getCurrentPageTitle().subscribe((title) => this.pageTitle = title);
	}

	async ngOnInit() {
		this.initAnalyticsPageView();
		await this.googleMapService.initMap();
		await this.mapsIndoorsService.initMapsIndoors();
		await this.themeService.setColors();
		this.ie11 = (navigator.userAgent.match(/Trident/g) || navigator.userAgent.match(/MSIE/g)) ? true : false;
		this.solutionService.setSolutionName();
		this.setLanguage();
		this.venue = this.venueService.venue;
		this.returnToValues = await this.mapsIndoorsService.getReturnToValues();
		this.addLocationListener();
		this.addFloorChangedListener();
		this.statusOk = true;
		this.returnTo();
		this.breakpointObserver
			.observe(['(min-width: 600px)'])
			.subscribe((state: BreakpointState) => {
				if (state.matches) { this.isHandset = false; }
				else { this.isHandset = true; }
			});
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

	// #region || SET BROWSER LANGUAGE
	async setLanguage() {
		const language = await window.navigator.language;
		// Do nothing if browser language is english
		if (language === "en") return;
		// Else check if browser language is supported in app
		// if( language == ("da" || "sp" || "la" || "ge"))		
		else if (language === "da") this.translate.use(language);
	}
	// #endregion

	// #region || CLEAR MAP
	async clearMap() {
		// this.mapsIndoorsService.mapsIndoors.fitVenue();
		this.googleMapService.infoWindow.close();
		this.locationService.searchQuery = "";
		this.locationService.clearCategory();
		this.mapsIndoorsService.setPageTitle();

		const solutionName = await this.solutionService.getSolutionName();
		const venue = await this.venueService.venue ? this.venueService.venue : this.mapsIndoorsService.mapsIndoors.getVenue();
		const venueId = venue.id ? venue.id : this.route.snapshot.params.venueId;
		const routerPath = solutionName + '/' + venueId + '/search';
		this.router.navigate([routerPath.toString()]);

		// Used for return to Venue or POI button
		const center = await [].concat(venue.anchor.coordinates).reverse();
		this.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);

		this.mapsIndoorsService.isMapDirty = false;
		// Google Analytics
		ga('send', 'event', 'Map', 'Clear map button click', 'Clear map button was clicked');
	}
	// #endregion

	// #region || LISTENER || RETURN TO VENUE OR POI
	returnTo() {
		const self = this;
		const googleMap = this.googleMapService.googleMap;
		const mapsIndoors = this.mapsIndoorsService.mapsIndoors;
		const container = document.getElementById('return-to-venue');

		// Return to venue button click listener
		const containerListener = google.maps.event.addDomListener(container, 'click', () => {
			if (self.returnToValues.venue === true) mapsIndoors.fitVenue();
			else self.googleMapService.googleMap.panTo(self.returnToValues.latLng);
		});

		// Get current venue bounding box
		google.maps.event.addListener(mapsIndoors, 'venue_changed', async () => {
			const venue = await self.venueService.venue ? self.venueService.venue : self.mapsIndoorsService.mapsIndoors.getVenue();
			if (venue) {
				const bounds = {
					east: -180,
					north: -90,
					south: 90,
					west: 180
				};
				venue.geometry.coordinates.reduce((bounds, ring) => {
					ring.reduce((bounds, coords) => {
						bounds.east = coords[0] >= bounds.east ? coords[0] : bounds.east;
						bounds.west = coords[0] <= bounds.west ? coords[0] : bounds.west;
						bounds.north = coords[1] >= bounds.north ? coords[1] : bounds.north;
						bounds.south = coords[1] <= bounds.south ? coords[1] : bounds.south;
						return bounds;
					}, bounds);
					return bounds;
				}, bounds);
				self.venueBoundingBox = bounds;
			}
		});

		// Fires when panning around on googleMap object
		// TODO: Add listener once?
		const panListener = google.maps.event.addListener(googleMap, 'idle', venueInsideBoundsCheck);

		// Checking if venue is inside googleMap bounds
		function venueInsideBoundsCheck() {
			if (self.mapsIndoorsService.mapsIndoors) {
				const googleBounds = googleMap.getBounds();
				// Always true except for when getting a direction
				if (self.venueService.favouredVenue && self.venueService.returnBtnActive) {
					// Hide button
					if (googleBounds && googleBounds.intersects(self.venueBoundingBox)) {
						if (container.className.indexOf(' hidden') < 0) {
							container.className += ' hidden';
						}
					}
					// Show button
					else {
						container.className = container.className.replace(' hidden', '');
						google.maps.event.removeListener(containerListener);
					}
				}
			}
		}
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

