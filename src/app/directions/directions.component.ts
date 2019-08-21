import { Component, OnInit, OnDestroy, NgZone, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenav } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../services/app-config.service';
import { UserAgentService } from '../services/user-agent.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { LocationService } from '../services/location.service';
import { VenueService } from '../services/venue.service';
import { ThemeService } from '../services/theme.service';
import { DirectionService } from '../services/direction.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SolutionService } from '../services/solution.service';
import { Venue } from '../shared/models/venue.interface';

declare const mapsindoors: any;
declare const ga: Function;

// interface step {
// 	maneuver: string;
// 	instruction: string;
// 	distance: string;
// }

// interface leg {
// 	index: number;
// 	travelModel: string;
// 	steps?: step[];
// 	showSteps: boolean;
// 	distanceAsText: string;
// 	durationAsText: string;
// 	firstStepInstruction?: string;
// 	firstStepInstructionIcon?: string;
// 	// Transit
// 	departure_time: string;
// }

@Component({
	selector: 'app-directions',
	templateUrl: './directions.component.html',
	styleUrls: ['./directions.component.scss']
})
export class DirectionsComponent implements OnInit, OnDestroy {
	isInternetExplorer: boolean;
	isHandset: boolean;
	statusOk: boolean = false;
	isViewActive: boolean;
	error: string;
	colors: any;
	loading: boolean = false;
	appConfig: any;
	venue: Venue;

	userPosition: any = {
		show: true,
		disabledInConfig: false,
		disabledByUser: false,
		ready: false,
		name: "",
		coordinates: null
	};

	travelMode: string = sessionStorage.getItem('TRAVEL_MODE') || 'WALKING';
	avoidStairs: boolean = false;

	inputState: string = "start"
	start: any = {
		query: "",
		previousQuery: "",
		location: {}
	}
	destination: any = {
		query: "",
		previousQuery: "",
		location: {}
	};
	searchResults = [];
	showAgencyInfo: boolean = false;
	poweredByGoogle: boolean = false;

	autocompleteService = new google.maps.places.AutocompleteService();
	geoCodingService = new google.maps.Geocoder()

	miDirectionsService = mapsindoors.DirectionsService;
	miGeoCodeService = mapsindoors.GeoCodeService;

	segmentHover: number; // Used for when hovering a segment

	debounceSearchOrigin: Subject<string> = new Subject<string>();
	debounceSearchDestination: Subject<string> = new Subject<string>();

	imperial: boolean;
	agencies = [];
	totalTravelDuration: string = "";
	totalTravelDistance: string = "";

	startLegLabel: string = "";
	segmentExpanded: number;
	currentLegIndex: number = 0;

	isHandsetSubscription: Subscription;
	originSearchSubscription: Subscription;
	destinationSearchSubscription: Subscription;
	legIndexSubscription: Subscription;
	appConfigSubscription: Subscription;
	themeServiceSubscription: Subscription;
	venueSubscription: Subscription;

	userRolesPanel = false;
	userRolesList = [];
	selecedUserRoles = [];
	private solutionId;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private sidenav: MatSidenav,
		private appConfigService: AppConfigService,
		private userAgentService: UserAgentService,
		private themeService: ThemeService,
		private translateService: TranslateService,
		private mapsIndoorsService: MapsIndoorsService,
		private solutionService: SolutionService,
		private googleMapService: GoogleMapService,
		private locationService: LocationService,
		private venueService: VenueService,
		private directionService: DirectionService
	) {
		this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		this.venueSubscription = this.venueService.getVenueObservable().subscribe((venue: Venue) => this.venue = venue);

		this.originSearchSubscription = this.debounceSearchOrigin
			.pipe(debounceTime(500)) // wait XX ms after the last event before emitting this event
			.pipe(distinctUntilChanged()) // only emit if value is different from previous value
			.subscribe((value) => {
				this.originSearch(value);
			});

		this.destinationSearchSubscription = this.debounceSearchDestination
			.pipe(debounceTime(500)) // wait XX ms after the last event before emitting this event
			.pipe(distinctUntilChanged()) // only emit if value is different from previous value
			.subscribe((value) => {
				this.destinationSearch(value);
			});

		this.legIndexSubscription = this.directionService.getLegIndex()
			.subscribe((index: number) => this.currentLegIndex = index);

		this.isHandsetSubscription = this.userAgentService.isHandset()
			.subscribe((value: boolean) => this.isHandset = value);
	}

	async ngOnInit() {
		this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
		this.isViewActive = true;
		this.solutionId = await this.solutionService.getSolutionId();
		this.userRolesList = await this.solutionService.getUserRoles();
		this.translateService.get("Direction.Directions").subscribe((value: string) => this.mapsIndoorsService.setPageTitle(value));
		this.populateFields();
		this.mapsIndoorsService.mapsIndoors.filter(null, false); // Clear filter if any
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
		this.mapsIndoorsService.isMapDirty = true; // Show clear map button
		this.selecedUserRoles = JSON.parse(localStorage.getItem(`MI:${this.solutionId}:APPUSERROLES`) || '[]');
		this.statusOk = true;
	}

	// #region || ROUTE

	async populateFields() {
		await this.setDestination();
		await this.setOrigin();
		this.getRoute();
	}

	// #region - || ORIGIN
	originSearchValueChanged(value: string) {
		this.error = null;
		this.debounceSearchOrigin.next(value);
	}

	async originSearch(query) {
		const self = this;
		this.inputState = 'start';
		this.error = null;
		// If query is the same as before
		if (this.start.query === this.start.previousQuery) {
			return;
		}
		else if (this.start.query && this.start.query !== '' && query.length > 1) {
			this.loading = true;
			// this.directionService.directionsLegs = [];
			this.clearRoute();
			this.userPosition.show = false;
			const results: any[] = await Promise.all([this.getLocations(self.start.query), this.getGooglePlaces(self.start.query)]);
			const locations = results[0].concat(results[1]);
			if (locations.length > 0) {
				this.searchResults = locations;
			}
			// Show "My location" if typing something similar
			else if (self.start.query.includes("My" || "my" || "position")) {
				self.userPosition.show = true;
			}
			else {
				this.error = "NoMatchingResults";
				this.searchResults = [];
			}
			this.start.previousQuery = self.start.query;
			this.showPoweredByGoogle();
			this.loading = false;
		}
		else {
			this.searchResults = [];
			this.start.previousQuery = null;
			this.userPosition.show = true;
			this.clearRoute();
		}
	}

	setOrigin() {
		return new Promise(async (resolve, reject) => {
			const originId: string = await this.route.snapshot.params.from;
			// If URL contains both from and to then get origin from that e.g.
			// https://.../route/from/5683d817423b7d1380c0ec7a/to/5683d817423b7d1380c0ec7a
			if (originId) {
				this.userPosition.show = false;
				this.locationService.getLocationById(originId)
					.then((origin: any) => {
						this.start.query = origin.properties.name;
						this.start.location = origin;
						resolve();
					})
					.catch(() => {
						reject();
					});
			}
			// else use user position
			else {
				await this.setUserPosition();
				resolve();
			}
		});
	}

	// #region - USER POSITION
	setUserPosition() {
		return new Promise(async (resolve, reject) => {
			this.loading = true;
			const configPositionSettings: any = this.appConfig.appSettings.positioningDisabled;
			// Check if position is disabled by app config-file
			if (configPositionSettings === '1') {
				this.userPositionError.bind(this);
				this.userPosition.disabledInConfig = true;
				this.loading = false;
				resolve();
			}
			// If users position already is set
			else if (this.userPosition.coordinates) {
				this.start.query = this.userPosition.name;
				this.start.location = {
					properties: { name: this.userPosition.name },
					geometry: { coordinates: this.userPosition.coordinates }
				};
				this.userPosition.show = false;
				resolve();
			}
			// Get users position by browser
			else {
				const self = this;
				await new Promise((resolve, reject) => {
					navigator.geolocation.getCurrentPosition((position) => {
						const coords = position.coords;
						self.userPosition.ready = true;
						self.userPosition.name = "My Position";
						self.userPosition.coordinates = [coords.longitude, coords.latitude];
						return resolve();
					}, this.userPositionError.bind(this));
				});
				this.start.query = this.userPosition.name;
				this.start.location = {
					properties: { name: this.userPosition.name },
					geometry: { coordinates: this.userPosition.coordinates }
				};
				this.userPosition.show = false;
				resolve();
			}
		});
	}

	userPositionError(err?) {
		this.userPosition.show = true;
		this.userPosition.ready = true;
		this.userPosition.disabledByUser = true;
		this.loading = false;
	}
	// #endregion

	clearOrigin() {
		this.start.location = null;
		this.start.query = '';
		this.start.previousQuery = null;
		this.clearRoute();
		this.searchResults = [];
		this.debounceSearchOrigin.next(); // Hack to clear previous query
		this.userPosition.show = true;
		document.getElementById("originInput").focus();
	}
	// #endregion

	// #region - || DESTINATION
	setDestination() {
		return new Promise(async (resolve, reject) => {
			const locationId = await this.route.snapshot.params.id ? this.route.snapshot.params.id : this.route.snapshot.params.to;
			this.locationService.getLocationById(locationId)
				.then((location: any) => {
					// NOTE: Support for old POI-objects
					// let coordinates = location.properties.anchor ? location.properties.anchor.coordinates : location.geometry.coordinates;
					// this.googleMapService.googleMap.panTo({ lat: coordinates[1], lng: coordinates[0] });

					const building = location.properties.building ? (location.properties.building + ', ') : "";
					this.destination.query = location.properties.name + ', Level ' + location.properties.floorName + ', ' + building + location.properties.venue;
					this.destination.location = location;
					this.directionService.destinationQuery = this.destination.query; // Used for horizontal directions
					resolve();
				})
				.catch(() => {
					reject();
				});
		});
	}

	destinationSearchValueChanged(value: string) {
		// this.error = null;
		this.debounceSearchDestination.next(value);
	}

	async destinationSearch(query) {
		this.inputState = 'dest';
		this.error = null;
		if (query && query.length > 0 && query !== '') {
			this.loading = true;
			// this.directionService.directionsLegs = [];
			this.clearRoute();
			const results: any[] = await Promise.all([this.getLocations(query), this.getGooglePlaces(query)]);
			const locations = results[0].concat(results[1]);
			if (locations.length > 0) {
				this.error = null;
				this.searchResults = locations;
			}
			else {
				this.error = "NoMatchingResults";
				this.searchResults = [];
			}
			this.destination.previousQuery = query;
			this.showPoweredByGoogle();
			this.loading = false;
		}
		else {
			this.clearRoute();
			this.searchResults = [];
			this.destination.previousQuery = null;
		}
	}

	clearDestination() {
		this.destination.location = null;
		this.destination.query = '';
		this.destination.previousQuery = null;
		this.clearRoute();
		this.searchResults = [];
		this.debounceSearchDestination.next(); // Hack to clear previous query
		document.getElementById("destinationInput").focus();
	}
	// #endregion

	// #region - SWITCH ORIGIN AND DESTINATION
	switchOriginAndDest() {
		const start = this.start.location;
		const startQ = this.start.query;
		const dest = this.destination.location;
		const destQ = this.destination.query;
		this.start.location = dest;
		this.start.query = destQ;
		this.destination.query = startQ;
		this.destination.location = start;
		const keepFloorSelector: boolean = false;
		this.clearRoute(keepFloorSelector); // Hack to keep floor selector hidden
		if (this.start.location && this.destination.location) {
			this.getRoute();
		}
		// Google Analytics
		ga('send', 'event', 'Directions page', 'Reverse route', 'Reverse route was clicked');
	}
	// #endregion

	// #region - TRAVEL MODE
	setNewTravelMode(travelMode) {
		const keepFloorSelector: boolean = false;
		this.clearRoute(keepFloorSelector); // Hack to keep floor selector hidden
		this.travelMode = travelMode;
		sessionStorage.setItem('TRAVEL_MODE', travelMode);
		if (this.start.location && this.destination.location) {
			this.getRoute();
		}
		// Google Analytics
		ga('send', 'event', 'Directions page', 'Travel mode switch', `${travelMode} was set as new travel mode`);
	}
	// #endregion

	// #region - TOGGLE SEGMENTS
	toggleSegment(legIndex) {
		if (legIndex === this.segmentExpanded) this.segmentExpanded = -1;
		else {
			this.segmentExpanded = legIndex;
			// Google Analytics
			ga('send', 'event', 'Directions page', 'Directions legs', 'Steps was unfolded');
		}
	}
	// #endregion

	// #region - AVOID STAIRS
	changeAvoidStairs() {
		this.avoidStairs = !this.avoidStairs;
		if (this.start.location && this.destination.location) {
			this.getRoute();
		}
		// Google Analytics
		ga('send', 'event', 'Directions page', 'Avoid stairs', `Avoid stairs was set to ${this.avoidStairs}`);
	}
	// #endregion

	// #region - TOGGLE USER ROLES PANEL
	/**
	 * toggles the visiblity of the user roles panel.
	 * @memberof DirectionsComponent
	 */
	toggleUserRolesPanel() {
		this.userRolesPanel = !this.userRolesPanel;
	}
	// #endregion

	// #region - onUserRolesChange EventHandler
	/**
	 * onUserRolesChange EventHandler
	 * Puts the selected User Roles into localStorage.
	 */
	onUserRolesChange() {
		localStorage.setItem('MI:' + this.solutionId + ':APPUSERROLES', JSON.stringify(this.selecedUserRoles));
		this.getRoute();
	}
	// #endregion

	// #region - || SEARCH RESULTS

	// #region - GOOGLE PLACES
	getGooglePlaces(query) {
		if (query.length > 3) {
			const self = this;
			return new Promise((resolve, reject) => {
				this.autocompleteService.getPlacePredictions({ input: query, componentRestrictions: this.appConfig.appSettings.countryCode ? { country: this.appConfig.appSettings.countryCode } : null }, (results, status) => {
					// var floor = self.mapsIndoorsService.mapsIndoors.getFloor();
					const iconPoi = '/assets/images/icons/google-poi.png';
					const places = (results || []).map((result) => {
						return {
							type: 'Feature',
							properties: {
								type: 'google_places',
								placeId: result.place_id,
								name: result.structured_formatting.main_text,
								subtitle: result.structured_formatting.secondary_text || '',
								floor: 0,
								iconUrl: iconPoi
							}
						};
					});
					return resolve(places);
				});
			});
		}
		else {
			return [];
		}
	}

	showPoweredByGoogle() {
		if (this.searchResults.length > 0) {
			const googlePlace = this.searchResults.find((item) => {
				return item.properties.type === 'google_places';
			});
			this.poweredByGoogle = (googlePlace ? true : false);
		}
		else {
			this.poweredByGoogle = false;
		}
	}
	// #endregion

	// #region - AGENCY INFO
	toggleAgencyInfo() {
		this.showAgencyInfo = !this.showAgencyInfo;
	}
	// #endregion

	// Get MapsIndoors locations
	async getLocations(query) {
		const self = this;
		let nearPosition;
		// If user provides a position
		if (this.userPosition.ready && this.userPosition.position) {
			const lat = self.userPosition.position.geometry.coordinates[1];
			const lng = self.userPosition.position.geometry.coordinates[0];
			nearPosition = { toUrlValue: function () { return 'lat:' + lat + ', lng:' + lng; } };
		}
		// Else take venue anchor point
		else {
			const venueId = await this.route.snapshot.params.venueId;
			nearPosition = { toUrlValue: function () { return 'venue:' + venueId; } };
		}
		const parameters = { q: query, take: 10, near: nearPosition };
		return this.locationService.getLocations(parameters);
	}

	// Format selected location and set
	selectLocation(location) {
		const self = this;
		this.searchResults = [];

		if (this.inputState === 'start') {
			this.userPosition.show = false;
			this.poweredByGoogle = false;
			// Google location
			if (location.properties.type === 'google_places') {
				this.start.query = location.properties.name + ', ' + location.properties.subtitle;
				this.start.previousQuery = this.start.query;
				// Getting coordinates for google place
				this.geoCodingService.geocode({ 'placeId': location.properties.placeId }, (results, status) => {
					if (results.length > 0) {
						location.geometry = {
							type: 'point',
							coordinates: [results[0].geometry.location.lng(), results[0].geometry.location.lat()]
						};
						self.start.location = location;
						self.getRoute();
					}
					else {
						console.log('Geocode was not successful for the following reason: ' + status);
					}
				});

			}
			// MapsIndoors location
			else {
				this.start.query = location.properties.name;
				this.start.query += location.properties.floorName ? ', Level ' + location.properties.floorName : '';
				this.start.query += location.properties.building ? ', ' + location.properties.building : '';
				this.start.query += location.properties.venue ? ', ' + location.properties.venue : '';
				this.start.previousQuery = this.start.query;
				this.start.location = location;
				this.getRoute();
			}
			// Google Analytics
			ga('send', 'event', 'Directions page', 'Origin Search', `${self.start.query} was set as start position`);

		}
		else if (this.inputState === 'dest') {
			this.poweredByGoogle = false;
			// Google location
			if (location.properties.type === 'google_places') {
				this.destination.query = location.properties.name + ', ' + location.properties.subtitle;
				this.destination.previousQuery = this.destination.query;
				// Getting coordinates for google place
				this.geoCodingService.geocode({ 'placeId': location.properties.placeId }, (results, status) => {
					if (results.length > 0) {
						location.geometry = {
							type: 'point',
							coordinates: [results[0].geometry.location.lng(), results[0].geometry.location.lat()]
						};
						self.destination.location = location;
						self.getRoute();
					}
					else {
						console.log('Geocode was not successful for the following reason: ' + status);
					}
				});
			}
			// MapsIndoors location
			else {
				this.destination.query = location.properties.name;
				this.destination.query += location.properties.floorName ? ', Level ' + location.properties.floorName : '';
				this.destination.query += location.properties.building ? ', ' + location.properties.building : '';
				this.destination.query += location.properties.venue ? ', ' + location.properties.venue : '';
				this.destination.location = location;
				this.getRoute();
			}
			// Google Analytics
			ga('send', 'event', 'Directions page', 'Destination Search', `${self.destination.query} was set as destination`);
		}
	}

	// Show or hide userPosition
	inputFocus(boolean) {
		if (this.userPosition.show !== boolean) {
			this.searchResults = [];
			this.error = null;
		}
		this.userPosition.show = boolean;
	}
	// #endregion

	// #region - || ROUTE REQUEST AND INTERACTIONS

	// #region - GET ROUTE DATA
	getRoute() {
		if (Object.keys(this.start.location).length !== 0 && Object.keys(this.destination.location).length !== 0) {
			const self = this;
			this.searchResults = [];
			this._ngZone.run(() => {
				this.loading = true;
			});
			this.venueService.returnBtnActive = false;
			this.poweredByGoogle = false;
			this.mapsIndoorsService.floorSelector(false);
			this.setUnitsPreference();

			const start = (self.start.location.properties && self.start.location.properties.anchor) ?
				// For new poi objects
				{ lat: self.start.location.properties.anchor.coordinates[1], lng: self.start.location.properties.anchor.coordinates[0], floor: self.start.location.properties.floor } :
				// For old poi objects and user positions
				{ lat: self.start.location.geometry.coordinates[1], lng: self.start.location.geometry.coordinates[0], floor: self.start.location.properties.floor };

			const dest = self.destination.location.properties.anchor ?
				// For new poi objects
				{ lat: self.destination.location.properties.anchor.coordinates[1], lng: self.destination.location.properties.anchor.coordinates[0], floor: self.destination.location.properties.floor } :
				// For old poi objects
				{ lat: self.destination.location.geometry.coordinates[1], lng: self.destination.location.geometry.coordinates[0], floor: self.destination.location.properties.floor };
			const args = {
				origin: start,
				destination: dest,
				mode: self.travelMode.toUpperCase(),
				avoidStairs: self.avoidStairs,
				userRoles: null
			};

			if (this.selecedUserRoles.length > 0) {
				args.userRoles = this.selecedUserRoles;
			}

			this.locationService.routeState = true;
			this.request(args)
				.then((data) => {
					if (this.isViewActive) {
						this._ngZone.run(async () => {

							await this.getAgencyInfo(data)
								.then((agencies: any) => {
									this.agencies = agencies;
								});

							this.getTotalDistance(data)
								.then(async (distance) => {
									// Transform distance value into text
									const transformedDistance = await this.distanceAsText(distance);
									this.totalTravelDistance = transformedDistance;
								});

							this.getTotalDuration(data)
								.then(async (duration) => {
									// Transform duration value into text
									const transformedDuration = await this.durationAsText(duration);
									this.totalTravelDuration = transformedDuration;
								});

							await this.addMissingData(data)
								.then((legs) => {
									this.currentLegIndex = 0;
									self.getStartLabel();
									this.directionService.setDirectionLegs(legs);
								});

							this.directionService.drawPolylines(0);
							this.loading = false;
						});
					}
				})
				.catch((err) => {
					console.log(err);
					this.loading = false;
					this.error = "NoRoute";
				});
		}
		else {
			this.error = "FromAndTo";
		}
	}

	request(args) {
		return new Promise((resolve, reject) => {
			this.miDirectionsService.getRoute(args)
				.then(async (data) => {
					const legs = JSON.parse(JSON.stringify(data.routes[0])).legs;
					const legsExtended = [];
					for (const leg of legs) {
						if (leg.departure_time) {
							for (const step of leg.steps) {
								step._mi = { type: "google.maps.DirectionsLeg" };
								legsExtended.push(step);
							}
						}
						else legsExtended.push(leg);
					}
					await this.setIndexForLegs(legsExtended).then((data) => {
						resolve(data);
					});
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	async setUnitsPreference() {
		this.imperial = await navigator.language === "en-US" ? true : false;
		// const firstStepText = legsExtended[0].steps[0].distance.text;
		// this.imperial = await (firstStepText.includes(" ft") || firstStepText.includes(" mi")) ? true : false;
	}

	getAgencyInfo(legs) {
		let agenciesArray = [];
		return new Promise((resolve, reject) => {
			for (const leg of legs) {
				if (leg.transit) {
					// If agency info is provided
					if (leg.transit.line.agencies) {
						const agencies = leg.transit.line.agencies.map((agency) => {
							if (agency.url) {
								const a = document.createElement('a');
								a.href = agency.url;
								agency.website = a;
								return agency;
							}
						});
						agenciesArray = agenciesArray.concat(agencies);
					}
				}
			}
			resolve(agenciesArray);
		});
	}

	setIndexForLegs(legsExtended) {
		let legIndex: number = 0;
		return new Promise((resolve, reject) => {
			for (const leg of legsExtended) {
				leg.index = legIndex ? legIndex : 0;
				legIndex = ++legIndex;
			}
			resolve(legsExtended);
		});
	}

	getTotalDistance(legs) {
		let totalDistance: number = 0;
		return new Promise((resolve, reject) => {
			for (const leg of legs) {
				// Counting up total travel distance
				totalDistance += leg.distance.value;
			}
			resolve(totalDistance);
		});
	}

	getTotalDuration(legs) {
		let totalDuration: number = 0;
		return new Promise((resolve, reject) => {
			for (const leg of legs) {
				// Counting up total travel time
				totalDuration += leg.duration.value;
			}
			resolve(totalDuration);
		});
	}

	addMissingData(legs) {
		const self = this;
		const isOutside = /^outside/i;
		const isInside = /^inside/i;
		const entranceOrExits = [];

		return new Promise(async (resolve, reject) => {
			for (const leg of legs) {
				if (!leg.transit) {
					leg.distance.text = await this.distanceAsText(leg.distance.value);
					leg.duration.text = await this.durationAsText(leg.duration.value);

					for (const step of leg.steps) {
						self.addMissingManeuver(step);
						step.distance.text = await this.distanceAsText(step.distance.value);
						step.duration.text = await this.durationAsText(step.duration.value);
					}

					// all MI legs
					if (leg._mi.type === 'mapsindoors.DirectionsLeg') {
						// Get previous leg for setting instruction
						const prev = leg.index > 0 ? legs[leg.index - 1] : null;

						if (prev && prev._mi.type !== 'mapsindoors.DirectionsLeg' && leg._mi.type === 'mapsindoors.DirectionsLeg') {
							leg.steps[0].instructions = '<span class="action">Enter:</span>';
							entranceOrExits.push(leg.steps[0]);
						}
						else if (prev && prev._mi.type === 'mapsindoors.DirectionsLeg' && leg._mi.type !== 'mapsindoors.DirectionsLeg') {
							leg.steps[0].instructions = '<span class="action">Exit:</span>';
							entranceOrExits.push(leg.steps[0]);
						}
						else if (prev && isInside.test(prev.steps[prev.steps.length - 1].abutters) && leg && isOutside.test(leg.steps[0].abutters)) {
							leg.steps[0].instructions = '<span class="action">Exit:</span>';
							entranceOrExits.push(leg.steps[0]);
						}
						else if (prev && isOutside.test(prev.steps[prev.steps.length - 1].abutters) && leg && isInside.test(leg.steps[0].abutters)) {
							leg.steps[0].instructions = '<span class="action">Enter:</span>';
							entranceOrExits.push(leg.steps[0]);
						}

						switch (leg.steps[0].highway) {
							case 'steps':
							case 'stairs':
								leg.steps[0].instructions = '<span class="action">Stairs: </span>Level ' + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
								break;
							case 'elevator':
								leg.steps[0].instructions = '<span class="action">Elevator: </span>Level ' + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
								break;
							case 'escalator':
								leg.steps[0].instructions = '<span class="action">Escalator: </span>Level ' + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
							default:
								break;
						}
					}
				}

				// For being able to set correct floor for Google Maps Directions legs, set the end and start zLevel from the next and previous legs if they exist.
				if (leg._mi.type === 'google.maps.DirectionsLeg') {
					if (
						legs[leg.index + 1] &&
						legs[leg.index + 1].steps &&
						legs[leg.index + 1].steps.some(step => 'zLevel' in step.start_location)
					) {
						leg.end_location.zLevel = legs[leg.index + 1].steps.find(step => 'zLevel' in step.start_location).end_location.zLevel;
					}

					if (
						legs[leg.index - 1] &&
						legs[leg.index - 1].steps &&
						legs[leg.index - 1].steps.some(step => 'zLevel' in step.end_location)
					) {
						leg.start_location.zLevel = legs[leg.index - 1].steps.find(step => 'zLevel' in step.end_location).end_location.zLevel;
					}
				}
			}

			// Getting venue with lat lng for steps
			// Then adding building- or venuename to step.instruction
			await this.miGeoCodeService.reverseGeoCode(entranceOrExits.map((step) => {
				return { lat: step.start_location.lat, lng: step.start_location.lng };
			})).then((results) => {
				entranceOrExits.forEach((step, index) => {
					const building = results[index].building || {};
					const venue: Venue = results[index].venue || {};
					step.instructions += ' ' + (building.name || venue.name || 'Building');
					step.horizontalInstructions = (building.name || venue.name || 'Building');
				});
			});

			resolve(legs);
		});
	}

	addMissingManeuver(step) {
		if (/head|walk/i.test(step.instructions) && step.maneuver === '') {
			step.maneuver = 'straight';
		}

		if (step.highway && (!step.instructions || step.instructions === '')) {
			switch (step.maneuver) {
				case 'straight':
					step.instructions = 'Continue straight ahead';
					break;
				case 'turn-left':
					step.instructions = 'Go left and continue';
					break;
				case 'turn-right':
					step.instructions = 'Go right and continue';
					break;
				case 'turn-sharp-left':
					step.instructions = 'Go sharp left and continue';
					break;
				case 'turn-sharp-right':
					step.instructions = 'Go sharp right and continue';
					break;
				case 'turn-slight-left':
					step.instructions = 'Go slight left and continue';
					break;
				case 'turn-slight-right':
					step.instructions = 'Go slight right and continue';
					break;
				case 'uturn-left':
				case 'uturn-right':
				case 'uturn':
					step.instructions = 'Turn around and continue';
					break;
			}
		}
	}

	durationAsText(val) {
		val = Math.max(val, 60);
		let days: any = Math.floor(val / 86400);
		val = val % 86400;
		let hours: any = Math.floor(val / 3600);
		val = val % 3600;
		let minutes: any = Math.floor(val / 60);
		days = days ? days > 1 ? days + ' days' : '1 day' : '';
		hours = hours ? hours > 1 ? hours + ' hours' : '1 hour' : '';
		minutes = minutes ? minutes > 1 ? minutes + ' mins' : '1 min' : '';

		const durationString: any = (days + ' ' + hours + ' ' + minutes);
		// return durationString.trimStart();
		return durationString; // IE11 support
	}

	distanceAsText(meters) {
		if (this.imperial) {
			if (meters < 1609.344) {
				const ft = meters * 3.2808;
				return Math.round(ft * 10) / 10 + ' ft';
			}
			else {
				const miles = meters / 1609.344;
				return (miles <= 328 ? Math.round(miles * 10) / 10 : Math.round(miles)) + ' mi';
			}
		}
		else {
			if (meters < 100) {
				return Math.round(meters * 10) / 10 + ' m';
			}
			else {
				meters = meters / 1000;
				return (meters <= 100 ? Math.round(meters * 10) / 10 : Math.round(meters)) + ' km';
			}
		}
	}

	// Used for creating origin input value
	getStartLabel() {
		// If startPosition is a google place
		if (this.start.location.properties.subtitle) {
			this.startLegLabel = this.start.location.properties.name + ' (' + this.start.location.properties.subtitle + ')';
		}
		// If startPosition is a MI poi or user position
		else {
			let startPosition = this.start.location.properties.name;
			let address = this.start.location.properties.floorName ? 'Level ' + this.start.location.properties.floorName : '';
			address += this.start.location.properties.building ? ', ' + this.start.location.properties.building : '';
			address += this.start.location.properties.venue ? ', ' + this.start.location.properties.venue : '';
			address = address.indexOf(', ') === 0 ? address.substring(2) : address;
			address = address > '' ? ' (' + address + ')' : '';
			startPosition += address;
			this.startLegLabel = startPosition;
		}
	}
	// #endregion

	// #region - INTERACTION WITH SEGMENTS
	prevSegment() {
		// TODO: Move prev and next to service and same for horizontal.component
		const index = (this.currentLegIndex - 1);
		this.directionService.setLegIndex(index);
	}

	nextSegment() {
		const index = (this.currentLegIndex + 1);
		this.directionService.setLegIndex(index);
	}

	segmentClick(legIndex) {
		// If not already selected
		if (legIndex !== this.currentLegIndex) {
			this.directionService.setLegIndex(legIndex);
		}
	}
	// #endregion

	/**
	 * @description Closing the sidebar
	 */
	showOnMap() {
		this.sidenav.close();
		// Google Analytics
		ga('send', 'event', 'Directions page', 'Show on map button', 'Show on map button was clicked');
	}

	// #endregion

	// #region - CLEAR ROUTE
	clearRoute(keepFloorSelector?) {
		if (!this.locationService.routeState) {
			return;
		}
		else {
			this.directionService.disposePolylines();
			this.directionService.directionsLegs = [];
			this.locationService.routeState = false;
			this.venueService.returnBtnActive = true;
			this.agencies = [];
			this.directionService.clearLegIndex();
			this.segmentExpanded = null;
			this.error = null;
			if (keepFloorSelector !== false) {
				this.mapsIndoorsService.floorSelector(true);
			}
		}
	}
	// #endregion

	// #endregion

	// #region || DESTROY
	async goBack() {
		const solutionName = await this.solutionService.getSolutionName();
		const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		const destinationId = this.route.snapshot.params.id;
		this.router.navigate([`${solutionName}/${venueId}/details/${destinationId}`]);
	}

	ngOnDestroy() {
		this.isViewActive = false;
		window["angularComponentRef"] = null;
		this.googleMapService.infoWindow.close();
		this.clearRoute();
		this.legIndexSubscription.unsubscribe();
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
		this.venueSubscription.unsubscribe();
		if (this.originSearchSubscription) { this.originSearchSubscription.unsubscribe(); }
		if (this.destinationSearchSubscription) { this.destinationSearchSubscription.unsubscribe(); }
	}
	// #endregion

}
