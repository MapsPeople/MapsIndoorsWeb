import { Component, NgZone } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ActivatedRoute, Event, Router, NavigationEnd, NavigationStart } from '@angular/router';
import { GoogleMapService } from './services/google-map.service';
import { MapsIndoorsService } from './services/maps-indoors.service';
import { LocationService } from './services/location.service';
import { ThemeService } from './services/theme.service';
import { DirectionService } from './services/direction.service';
import { VenueService } from './services/venue.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { SolutionService } from './services/solution.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})

export class AppComponent {
	ie11: boolean = false;
	isHandset: any;
	statusOk: boolean = false;
	colors: object;
	loading: boolean = false;
	venue: any;
	venueBoundingBox: any;
	returnToValues: any;
	pageTitle: string;
	location: any;

	locationClickListener: any;
	floorChangedListener: any;
	currentLocationPolygon: any;

	routeSubscription: Subscription;

	constructor(
		private breakpointObserver: BreakpointObserver,
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private translate: TranslateService,
		private googleMapService: GoogleMapService,
		private mapsIndoorsService: MapsIndoorsService,
		private solutionService: SolutionService,
		private locationService: LocationService,
		private themeService: ThemeService,
		public directionService: DirectionService,
		private venueService: VenueService
	) {
		// Workaround to get correct vh across different browsers
		let vh = window.innerHeight;
		document.body.style.setProperty('height', `${vh}px`);
		window.addEventListener('resize', () => {
			let vh = window.innerHeight;
			document.body.style.setProperty('height', `${vh}px`);
		});

		// Set default language
		translate.setDefaultLang('en');

		// Subscribe to location
		this.locationService.getCurrentLocation().subscribe(location => {
			this.location = location;
		});

		this.mapsIndoorsService.getCurrentPageTitle().subscribe(title => {
			this.pageTitle = title;
		});
	}

	async ngOnInit() {
		this.ie11 = (navigator.userAgent.match(/Trident/g) || navigator.userAgent.match(/MSIE/g)) ? true : false;
		this.googleMapService.loadMap();
		this.mapsIndoorsService.setMapsIndoors();
		this.solutionService.setSolutionName();
		this.colors = await this.themeService.getThemeColors();
		this.checkLanguage();
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

	// #region || CHECK BROWSER LANGUAGE
	async checkLanguage() {
		var language = await window.navigator.language || await window.navigator.language;
		// Do nothing if browser language is english
		if (language == "en") {
			return
		}
		// Else check if browser language is supported in app
		else if (language == "da") {
			// if( language == ("da" || "sp" || "la" || "ge")) { 		
			this.translate.use(language);
		}
	}
	// #endregion

	// #region || CLEAR MAP
	async clearMap() {
		// this.mapsIndoorsService.mapsIndoors.fitVenue();
		this.googleMapService.infoWindow.close();
		this.locationService.searchQuery = "";
		this.locationService.searchCategory = null;
		this.mapsIndoorsService.setPageTitle()

		let venue = await this.venueService.venue ? this.venueService.venue : this.mapsIndoorsService.mapsIndoors.getVenue();
		let venueId = venue.id ? venue.id : this.route.snapshot.params.venueId;
		let routerPath = venueId + '/search';
		this.router.navigate([routerPath.toString()])

		// Used for return to Venue or POI button
		let center = await [].concat(venue.anchor.coordinates).reverse();
		this.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);

		this.mapsIndoorsService.isMapDirty = false;
	}
	// #endregion

	// #region || LISTENER || RETURN TO VENUE OR POI
	async returnTo() {
		var self = this;
		let googleMap = this.googleMapService.googleMap;
		let mapsIndoors = this.mapsIndoorsService.mapsIndoors;
		let container = document.getElementById('return-to-venue');

		// Return to venue button click listener
		let containerListener = google.maps.event.addDomListener(container, 'click', async function () {
			if (self.returnToValues.venue == true) {
				mapsIndoors.fitVenue();
			}
			else {
				var latLng = new google.maps.LatLng(self.returnToValues.latLng[0], self.returnToValues.latLng[1]);
				self.googleMapService.googleMap.panTo(latLng);
			}
		});

		// Get current venue bounding box
		let venueListener = google.maps.event.addListener(mapsIndoors, 'venue_changed', async () => {
			let venue = await self.venueService.venue ? self.venueService.venue : self.mapsIndoorsService.mapsIndoors.getVenue();
			if (venue) {
				var bounds = {
					east: -180,
					north: -90,
					south: 90,
					west: 180
				};
				venue.geometry.coordinates.reduce(function (bounds, ring) {
					ring.reduce(function (bounds, coords) {
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
		let panListener = google.maps.event.addListener(googleMap, 'idle', venueInsideBoundsCheck);

		// Checking if venue is inside googleMap bounds
		async function venueInsideBoundsCheck() {
			if (self.mapsIndoorsService.mapsIndoors) {
				let googleBounds = googleMap.getBounds();
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
	async addLocationListener() {
		let mapsIndoors = this.mapsIndoorsService.mapsIndoors;
		let self = this;

		this.locationClickListener = google.maps.event.addListener(mapsIndoors, 'click', async (location) => {

			let venue = await self.venueService.venue ? self.venueService.venue : self.mapsIndoorsService.mapsIndoors.getVenue();
			let venueId = venue.id;

			self._ngZone.run(async () => {
				let routerPath = venueId + '/details/' + location.id;
				this.router.navigate([routerPath.toString()]);
				let loc = await this.locationService.getLocationById(location.id)
				this.locationService.setLocation(loc);
			});

			// If any existing polygons then remove it first 
			if (this.currentLocationPolygon) {
				this.currentLocationPolygon.setMap(null);
			}
			self.openInfoWindow(location);

			if (location.geometry.coordinates) {
				let paths = [];
				for (let coords of location.geometry.coordinates) {
					let path = [];
					for (let point of coords) {
						path.push(new google.maps.LatLng(point[1], point[0]));
					}
					paths.push(path);
				}
				self.currentLocationPolygon = new google.maps.Polygon({
					paths: paths,
					strokeColor: '#43aaa0',
					strokeOpacity: 1,
					strokeWeight: 1,
					fillColor: '#43aaa0',
					fillOpacity: 0.2
				});
				self.currentLocationPolygon.setMap(self.googleMapService.googleMap);
			}
		});
	}


	// Open info-window and set content
	async openInfoWindow(location) {
		let infoContent: string = '<a class="infowindow text-link"><b>' + location.properties.name + '</b></a>';
		this.googleMapService.infoWindow.setContent(infoContent);
		// Check if it's a new poi object
		if (location.properties.anchor) {
			this.googleMapService.infoWindow.setPosition(new google.maps.LatLng(location.properties.anchor.coordinates[1], location.properties.anchor.coordinates[0]));
		}
		// For old poi objects
		else {
			this.googleMapService.infoWindow.setPosition(new google.maps.LatLng(location.geometry.coordinates[1], location.geometry.coordinates[0]));
		}
		this.googleMapService.infoWindow.open(this.googleMapService.googleMap);
	}

	// #endregion

	// #region || LISTENER || FLOOR CHANGED
	// Closes and opens info-windows when changing floors
	async addFloorChangedListener() {
		let mapsIndoors = await this.mapsIndoorsService.mapsIndoors;
		let self = this;
		this.floorChangedListener = google.maps.event.addListener(mapsIndoors, 'floor_changed', () => {
			if (!this.locationService.routeState && self.location) {
				let locationFloor = self.location.properties.floor;
				if (locationFloor && parseInt(locationFloor) != self.mapsIndoorsService.mapsIndoors.getFloor()) {
					self.googleMapService.infoWindow.close();
				} else {
					self.googleMapService.infoWindow.open(self.googleMapService.googleMap);
				}
			}
		});
	}
	// #endregion

}

