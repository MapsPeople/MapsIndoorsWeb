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

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { NotificationService } from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';

declare const ga: Function;

enum ErrorVenueId {
	undefinedId,
	incorrectId
}

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
		private activatedRoute: ActivatedRoute,
		private translateService: TranslateService,
		private notificationService: NotificationService
	) { }

	async ngOnInit() {
		this.appConfigService.getAppConfig()
			.subscribe((appConfig) => this.appConfig = appConfig);
		this.themeService.getThemeColors()
			.subscribe((appConfigColors) => this.colors = appConfigColors);
		this.venueService.getVenueObservable()
			.subscribe((venue: Venue) => {
				this.venue = venue;
				this.initReturnToButton();
			});
		this.locationService.getCurrentLocation()
			.subscribe((location: Location) => this.location = location);
		this.mapsIndoorsService.getCurrentPageTitle()
			.subscribe((title: string) => this.pageTitle = title);
		this.userAgentService.isHandset()
			.subscribe((value: boolean) => this.isHandset = value);
		this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
		this.initAnalyticsPageView();
		await this.googleMapService.initMap();
		await this.mapsIndoorsService.initMapsIndoors();

		this.getVenueFromUrl()
			.then(async (venue: Venue) => {
				await this.venueService.setVenue(venue, this.appConfig);
				this.mapsIndoorsService.showFloorSelector();
			})
			.catch((err) => {
				this.router.navigate([`${this.solutionService.getSolutionName()}/venues`]);
				if (err === ErrorVenueId.incorrectId) {
					this.notificationService.displayNotification(
						this.translateService.instant('Error.IncorrectId')
					);
				}
			});
		await this.themeService.setColors();
		this.mapsIndoorsService.getReturnToValues()
			.subscribe((values) => {
				this.returnToValues = values;
			});
		this.addLocationListener();
		this.addFloorChangedListener();
		this.returnBtn = document.getElementById('return-to-venue');
		this.statusOk = true;
	}

	/**
	 * @description Gets the venue based on the venueId param in the URL.
	 * @returns {Promise<Venue>}
	 * @memberof MapComponent
	 */
	getVenueFromUrl(): Promise<Venue> {
		return new Promise((resolve, reject) => {
			const id = this.route.children[0].snapshot.params.venueId;
			if (id && id.length === 24) {
				this.venueService.getVenueById(id)
					.then((venue: Venue) => {
						resolve(venue);
					})
					.catch(() => {
						reject(ErrorVenueId.incorrectId);
					});
			}
			else reject(id ?
				ErrorVenueId.incorrectId :
				ErrorVenueId.undefinedId
			);
		});
	}

	/**
	 * @description Sends a pageview to Google Analytics after each navigation-end event
	 */
	private initAnalyticsPageView(): void {
		this.router.events.subscribe((event) => {
			if (event instanceof NavigationEnd) {
				ga('set', 'page', event.urlAfterRedirects);
				ga('send', 'pageview');
				if (this.appConfig && this.appConfig.appSettings.gaKey) ga('clientTracker.send', 'pageview');
			}
		});
	}

	// #region || CLEAR MAP
	clearMap(): void {
		this.googleMapService.closeInfoWindow();
		this.locationService.searchQuery = "";
		this.locationService.clearCategory();
		this.mapsIndoorsService.setPageTitle();
		this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
		this.mapsIndoorsService.setVenueAsReturnToValue(this.venue);
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
	private initReturnToButton(): void {
		const googleMap = this.googleMapService.googleMap;
		google.maps.event.addListener(googleMap, 'idle', () => {
			// Always true except for when getting a direction
			if (this.venueService.favouredVenue && this.venueService.returnBtnActive) {
				// Hides the button if the selected venue is inside the current googleMap bounds
				if (googleMap.getBounds().intersects(this.venue.boundingBox)) {
					if (this.returnBtn.className.includes('hidden') === false) {
						this.returnBtn.className += ' hidden';
					}
				}
				// Shows the button when panned away from selected venue or location.
				else {
					this.returnBtn.className = this.returnBtn.className.replace(' hidden', '');
				}
			}
		});
	}

	/**
	 * @description Fits the venue if a locations isn't selected.
	 * @memberof MapComponent
	 */
	returnToButtonClickHandler(): void {
		if (this.returnToValues.isVenue === true) {
			this.mapsIndoorsService.mapsIndoors.fitVenue();
		}
		else {
			this.googleMapService.googleMap.panTo(this.returnToValues.latLng);
		}
	}
	//#endregion

	// #region || LISTENER || LOCATION CLICK
	/**
	 * Adding a listener for clicks on locations
	 * @listens event:click
	 */
	addLocationListener(): void {
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
	handleClusterClick(locations: Location[]): void {
		// Zoom if zoom-level is lower than 21
		if (this.googleMapService.googleMap.getZoom() < 21) {
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
			this.locationService.setClusteredLocations(locations);
			// Google Analytics
			ga('send', 'event', 'Map', 'Cluster click', 'Clustered locations was clicked');
		}
	}

	/**
	 * Navigating to details page when a single location are clicked on the map.
	 * @param location	The clicked location.
	 */
	handleSingleLocationClick(location: Location): void {
		this.loading = true;
		this.locationService.setLocation(location)
			.then(() => {
				this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/details/${location.id}`]);
			})
			.catch((err) => {
				this.notificationService.displayNotification(err);
			});
		// Google Analytics
		ga('send', 'event', 'Map', 'Location click', `${location.properties.name} was clicked`);
	}
	// #endregion

	// #region || LISTENER || FLOOR CHANGED
	// Closes and opens info-windows when changing floors
	addFloorChangedListener(): void {
		google.maps.event.addListener(this.mapsIndoorsService.mapsIndoors, 'floor_changed', () => {
			if (this.location && this.route.children[0].snapshot.routeConfig.component.name === 'DetailsComponent') {
				const locationFloor: string = this.location.properties.floor;
				if (locationFloor !== this.mapsIndoorsService.mapsIndoors.getFloor()) {
					this.googleMapService.closeInfoWindow();
					// Remove location polygon
					if (this.locationService.polygon) this.locationService.polygon.setMap(null);
				} else {
					this.googleMapService.openInfoWindow();
					// Set location polygon
					if (this.locationService.polygon) this.locationService.polygon.setMap(this.googleMapService.googleMap);
				}
			}
		});
	}
	// #endregion

}

