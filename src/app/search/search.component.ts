import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { LocationService } from '../services/location.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { InfoDialogComponent } from './info-dialog/info-dialog.component';
import { ThemeService } from '../services/theme.service';
import { GoogleMapService } from '../services/google-map.service';
import { environment } from '../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
	selector: 'app-search',
	templateUrl: './search.component.html',
	styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
	statusOk: boolean = false;
	appConfig: any;
	colors: object;
	categoriesMenu: any;
	venue: any;
	SearchHintAppTitle: string = "";

	previousQuery: string = ""
	error: string;
	search: any = {
		query: null,
		category: null
	};
	locationsArray: any = [];
	searchFocus: boolean = false;
	loading: boolean = false;

	skip: any;
	loadingLocations: boolean = false;
	endOfArray: boolean = false;

	zoomBtn: any;
	zoomBtnListener: any;

	debounceSearch: Subject<string> = new Subject<string>();
	debounceSearchSubscription: Subscription;
	dialogSubscription: Subscription;
	dialogRef: MatDialogRef<InfoDialogComponent>;
	public appVersion: string = environment.version;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private venueService: VenueService,
		private googleMapService: GoogleMapService,
		private locationService: LocationService,
		private mapsIndoorsService: MapsIndoorsService,
		private infoDialog: MatDialog,
		private themeService: ThemeService,
	) {
		this.debounceSearchSubscription = this.debounceSearch
			.pipe(debounceTime(500)) // wait XX ms after the last event before emitting last event
			.pipe(distinctUntilChanged()) // only emit if value is different from previous value
			.subscribe(value => {
				this.getLocationsForQuery(value)
			});
	}

	async ngOnInit() {
		this.appConfig = await this.appConfigService.getConfig();
		await this.checkForVenue();
		this.zoomForDetails();
		this.getPreviousCategoryAndQuery();
		this.colors = await this.themeService.getThemeColors();
		this.mapsIndoorsService.setPageTitle()
		this.SearchHintAppTitle = this.appConfig.appSettings.title;
		this.categoriesMenu = this.appConfig.menuInfo.mainmenu;
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
		if (this.route.snapshot.queryParams.cat) { this.getLocationsForCategory() };
		this.statusOk = true;
	}

	// #region || SET VENUE
	async checkForVenue() {
		let self = this;
		let venueIdFromURL = this.route.snapshot.params.venueId;
		let venueRequest = this.venueService.venue ? this.venueService.venue : {};
		let urlVenueId = await venueIdFromURL;
		let venue = await venueRequest;

		// If the user comes from a previous page
		if (venue && venue.id === urlVenueId) {
			this.venue = venue;
			this.countVenues();

			// Used for return to "something" button
			let center = await [].concat(venue.anchor.coordinates).reverse();
			self.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);
		}
		// If direct url
		else {
			let venue = await self.venueService.getVenueById(urlVenueId)
			this.venueService.setVenue(venue, self.appConfig).then(result => {
				self.venue = result;
			});
			this.countVenues();
		}
		this.mapsIndoorsService.floorSelector(true)
	}

	async countVenues() {
		let venuesLength = await this.venueService.getVenuesLength()
		// If only one venue then hide non relevant elements
		this.venue.onlyVenue = venuesLength == 1 ? true : false;
	}
	// #endregion 

	// #region || SEARCH AND RESULTS

	async getDetails(id) {
		let venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		let routerPath = venueId + '/details/' + id;
		this.router.navigate([routerPath.toString()])
	}

	async getPreviousCategoryAndQuery() {
		let categoryRequest = this.locationService.searchCategory;
		let queryRequest = this.locationService.searchQuery;
		let category = await categoryRequest;
		let query = await queryRequest;

		// Repopulate the category and search query with the previously chosen category and typed query
		if (category && query) {
			this.getLocationsForCategory(category)
			this.getLocationsForQuery(query);
			this.search.query = query;
		}
		// Repopulate with previously chosen category
		else if (category) {
			this.getLocationsForCategory(category)
		}
		// Repopulate search-field with previously typed query
		else if (query) {
			this.search.query = query;
			this.getLocationsForQuery(query);
		}
		else {
			this.clearAll();
		}
	}

	// Show/hide search hint when focus/blur on input 
	searchInFocus(booleanValue) {
		if (this.search.query && this.search.query.length == 1) {
			return
		}
		this.searchFocus = booleanValue;
	}

	async getLocationsForCategory(c?) {
		if (this.locationService.searchQuery) { return }
		const category = await c ? c : this.appConfig.menuInfo.mainmenu.find(x => x.name.toLowerCase() == this.route.snapshot.queryParams.cat.toLowerCase());;

		// Redirect if given category isn't valid
		if (!category) {
			let venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
			let routerPath = venueId + '/search';
			this.router.navigate([routerPath.toString()])
			return
		}

		this.loading = true;
		this.locationsArray = null;
		this.endOfArray = false;
		this.search.category = category.name;
		this.locationService.searchCategory = category;
		this.mapsIndoorsService.setPageTitle(category.name)

		// If no existing cat in the URL
		if (!this.route.snapshot.queryParams.cat) {
			this.router.navigate([], { queryParams: { cat: category.name.toLowerCase() } });
		}

		await this.categoryRequest(category).then(locations => {
			this.locationsArray = locations && locations.length > 0 ? locations : null;
		});
		// Check if empty category
		this.error = this.locationsArray == null ? "EmptyCategory" : null;
		this.loading = false;
	}

	async categoryRequest(category, skip?) {
		let s = skip | 0;
		let parameters = { take: 50, skip: s, venue: this.venue.name, categories: category.categoryKey, orderBy: 'name' }
		let locations = await this.locationService.getLocations(parameters);
		// Display this locations on map
		await this.pushLocationsToMap(locations, skip);
		return locations
	}

	searchValueChanged(value: string) {
		this.debounceSearch.next(value);
	}

	async getLocationsForQuery(query) {

		// Show hint
		if (query && (query.length < 2 || query == '')) {
			if (!this.search.category) {
				this.error = null;
				this.locationsArray = null;
				this.searchFocus = true;
			}
			else {
				this.getLocationsForCategory(this.locationService.searchCategory);
			}
			this.mapsIndoorsService.mapsIndoors.filter(null)
		}
		// Get locations
		else if (query && query.length > 1) {
			let self = this;
			this.loading = true;
			this.error = null;
			this.searchFocus = false;
			this.locationsArray = null;

			// Clear "get more locations" variables
			this.skip = 0;
			this.endOfArray = false;
			// Set query for later use
			this.previousQuery = query;
			this.locationService.searchQuery = query;
			// Send request
			await this.queryRequest(query).then(locations => {
				self.locationsArray = locations && locations.length > 0 ? locations : null;
			});
			// If locationsArray is empty
			if (!this.locationsArray) {
				// If no locations for query
				if (!self.locationService.searchCategory) { self.error = "NoResults" }
				// If no locations for query in category
				else { self.error = "NoResultsInCategory" }
			}
			this.loading = false;
		}
		else {
			this.error = null;
			this.clearQuery();
		}
	}

	async queryRequest(query, skip?) {
		let s = skip | 0;
		let parameters = this.locationService.searchCategory ?
			// If there are a category
			{ q: query, take: 50, skip: s, categories: this.locationService.searchCategory.categoryKey, orderBy: 'name' } :
			// Else request without
			{ q: query, take: 50, skip: s, orderBy: 'name' };
		let locations = await this.locationService.getLocations(parameters);
		// Display this locations on map
		await this.pushLocationsToMap(locations, skip);
		return locations
	}

	// Used for showing search results on map
	pushLocationsToMap(locations, skip) {
		let locationsIdArray = [];
		if (locations.length <= 0) {
			return
		}
		// Only if getting more locations 
		else if (skip > 0) {
			// then add the id's of the already existing locations to this local locationsIdArray[] variable
			for (let location of this.locationsArray) {
				locationsIdArray.push(location.id)
			}
		}
		// Push new location id's to locationsIdArray
		for (let location of locations) {
			locationsIdArray.push(location.id)
		}
		// Filter poi's on map based on id's in "locationsIdArray" 
		this.mapsIndoorsService.mapsIndoors.filter(locationsIdArray, true);
	}

	// If more than 50 locations, then load next 50 locations on button click
	async getMoreLocations() {
		let query = await this.search.query;
		this.loadingLocations = true;
		let s = this.skip ? this.skip : 50;
		// If searching by a query
		if (query && query.length != 0) {
			await this.queryRequest(query, s).then(locations => {
				if (locations.length <= 0) {
					// No more locations
					this.endOfArray = true;
					return
				}
				for (let location of locations) {
					this.locationsArray.push(location);
				}
			});
		}
		// If searching only by a category
		else {
			await this.categoryRequest(this.locationService.searchCategory, s).then(locations => {
				if (locations.length <= 0) {
					// No more locations
					this.endOfArray = true;
					return
				}
				for (let location of locations) {
					this.locationsArray.push(location);
				}
			});
		}
		this.loadingLocations = false;
		this.skip = (s += 50);
	}

	// Clear query 
	async clearQuery() {
		this.search.query = "";
		this.previousQuery = "";
		this.skip = 0;
		this.locationService.searchQuery = "";
		this.searchFocus = false;
		// If both a category and a query
		if (this.locationService.searchCategory) {
			let category = await this.locationService.searchCategory
			this.getLocationsForCategory(category)
		}
		else {
			this.clearAll();
		}
	}
	// #endregion

	// #region || ZOOM FOR MORE DETAILS
	async zoomForDetails() {
		let self = this;
		let googleMap = this.googleMapService.googleMap;
		this.zoomBtn = document.getElementById('zoom-for-details');
		let solutionId = await this.solutionService.getSolutionId()
		let hideZoomBtnLocalStorage = await localStorage.getItem('MI:' + solutionId + '-hideZoom')

		// Hide the zoom button if the user has visited the app before else show it
		hideZoomBtnLocalStorage === 'true' ? this.hideZoomBtn() : showZoomBtn();

		function showZoomBtn() {
			self.zoomBtn.className = self.zoomBtn.className.replace(' hidden', '');
		}

		// Hides zoom button when clicked
		this.zoomBtnListener = google.maps.event.addDomListenerOnce(this.zoomBtn, 'click', function () {
			googleMap.setZoom(Math.max(18, googleMap.getZoom() + 1));
			self.hideZoomBtn();
		})
		// Hides zoom button when map is dragged
		google.maps.event.addListenerOnce(googleMap, 'dragend', function () {
			self.hideZoomBtn();
		});

		// Remove zoom button when the user zooms
		google.maps.event.addListenerOnce(googleMap, 'idle', function () {
			google.maps.event.addListenerOnce(googleMap, 'zoom_changed', function () {
				self.hideZoomBtn();
			});
		});
	}

	async hideZoomBtn() {
		let solutionId = await this.solutionService.getSolutionId()
		if (this.zoomBtn.className.indexOf(' hidden') < 0) {
			this.zoomBtn.className += ' hidden';
		}
		google.maps.event.removeListener(this.zoomBtnListener);
		localStorage.setItem('MI:' + solutionId + '-hideZoom', 'true');
	}
	// #endregion

	// #region || DESTROY 
	async goBack() {
		// If query or selected category
		if (this.search.query || this.search.category) {
			this.clearAll();
			this.mapsIndoorsService.setPageTitle()
			this.mapsIndoorsService.isMapDirty = false;

			let venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
			let routerPath = venueId + '/search';
			this.router.navigate([routerPath.toString()])
		}
		// Go back to venues page
		else {
			const solutionId = await this.solutionService.getSolutionId();
			localStorage.removeItem('MI:' + solutionId);
			this.mapsIndoorsService.floorSelector(false);
			this.clearAll();
			this.venueService.favouredVenue = false;
			this.venueService.fitVenues = false;
			let routerPath = 'venues';
			this.router.navigate([routerPath.toString()])
			this.mapsIndoorsService.isMapDirty = false;
		}
	}

	clearAll() {
		this.locationsArray = [];
		this.mapsIndoorsService.mapsIndoors.filter(null)
		this.debounceSearch.next(); // Hack to clear previous query
		this.skip = 0;
		this.error = null
		this.search.category = null;
		this.previousQuery = null;
		this.locationService.searchCategory = null;
		this.search.query = null;
		this.locationService.searchQuery = null;
		this.loading = false;
	}

	ngOnDestroy() {
		this.hideZoomBtn();
		window["angularComponentRef"] = null;
		this.mapsIndoorsService.mapsIndoors.filter(null)
		// this.googleMapService.infoWindow.close();
		if (this.dialogSubscription) { this.dialogSubscription.unsubscribe(); }
		if (this.debounceSearchSubscription) { this.debounceSearchSubscription.unsubscribe(); }
	}
	// #endregion

	// #region || DIALOG || INFO 
	openInfoDialog() {
		this.dialogRef = this.infoDialog.open(InfoDialogComponent, {
			width: '500px',
			autoFocus: false,
			disableClose: false,
			data: {
				appTitle: this.appConfig.appSettings.title,
				appVersion: this.appVersion,
				sdkVersion: this.mapsIndoorsService.mapsIndoors.__VERSION__
			}
		})

		this.dialogSubscription = this.dialogRef.afterClosed().subscribe(() => {
			let btn = document.getElementById('infoDialogOpenButton');
			btn.classList.remove('cdk-program-focused');
			btn.classList.add('cdk-mouse-focused');
		})
	}
	// #endregion

}
