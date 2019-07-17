import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LocationService } from '../services/location.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { InfoDialogComponent } from './info-dialog/info-dialog.component';
import { ThemeService } from '../services/theme.service';
import { GoogleMapService } from '../services/google-map.service';
import { environment } from '../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

declare const ga: Function;

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
	category: any;
	error: string;
	search: any = {
		query: null,
		category: null
	};
	locationsArray: any[] = [];
	filtered: boolean = false;
	clusteredLocationsSubscription: Subscription;
	searchFocus: boolean = false;
	loading: boolean = false;

	skip: any;
	loadingLocations: boolean = false;
	endOfArray: boolean = false;

	zoomBtn: any;
	zoomBtnListener: any;

	debounceSearch: Subject<string> = new Subject<string>();
	debounceSearchSubscription: Subscription;

	categorySubscription: Subscription;

	dialogSubscription: Subscription;
	dialogRef: MatDialogRef<InfoDialogComponent>;
	public appVersion: string = environment.v;
	appConfigSubscription: Subscription;
	themeServiceSubscription: Subscription;

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
		this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		
		this.debounceSearchSubscription = this.debounceSearch
			.pipe(debounceTime(500)) // wait XX ms after the last event before emitting last event
			.pipe(distinctUntilChanged()) // only emit if value is different from previous value
			.subscribe((value) => {
				this.getLocationsForQuery(value);
			});

		this.clusteredLocationsSubscription = this.locationService.getClusteredLocations().subscribe((locations) => {
			this.locationsArray = locations;
			this.filtered = true;
		});
	}

	async ngOnInit() {
		await this.checkForVenue();
		this.zoomForDetails();
		// await this.getClusteredLocations();
		if (this.locationsArray.length === 0) this.getPreviousCategoryAndQuery();
		this.SearchHintAppTitle = this.appConfig.appSettings.title;
		this.categoriesMenu = this.appConfig.menuInfo.mainmenu;
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
		this.statusOk = true;
	}

	// #region || SET VENUE
	async checkForVenue() {
		const self = this;
		const venueIdFromURL = this.route.snapshot.params.venueId;
		const venueRequest = this.venueService.venue ? this.venueService.venue : {};
		const urlVenueId = await venueIdFromURL;
		const venue = await venueRequest;

		// If the user comes from a previous page
		if (venue && venue.id === urlVenueId) {
			this.venue = venue;
			this.countVenues();

			// Used for return to "something" button
			const center = await [].concat(venue.anchor.coordinates).reverse();
			self.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);
		}
		// If direct url
		else {
			const venue = await self.venueService.getVenueById(urlVenueId);
			this.venueService.setVenue(venue, self.appConfig).then((result) => {
				self.venue = result;
			});
			this.mapsIndoorsService.setPageTitle(venue.venueInfo.name);
			this.countVenues();
		}
		this.mapsIndoorsService.floorSelector(true);
	}

	async countVenues() {
		const venuesLength = await this.venueService.getVenuesLength();
		// If only one venue then hide non relevant elements
		this.venue.onlyVenue = venuesLength === 1 ? true : false;
	}
	// #endregion

	// #region || SEARCH AND RESULTS

	async setLocation(location) {
		this.locationService.setLocation(location);

		const solutionName = await this.solutionService.getSolutionName();
		const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		this.router.navigate([`${solutionName}/${venueId}/details/${location.id}`]);
	}

	// getClusteredLocations() {
	// 	return new Promise((resolve, reject) => {
	// 		this.locationService.getClusteredLocations().then((locations: any) => {
	// 			for (let location of locations) this.locationsArray.push(location);
	// 			resolve();
	// 		});
	// 	})
	// }

	async getPreviousCategoryAndQuery() {
		let category;
		this.locationService.getCategory().then((result) => category = result);
		// Get category from URL
		if (!category && this.route.snapshot.queryParams.cat) category = await this.appConfig.menuInfo.mainmenu.find((x) => x.name.toLowerCase() === this.route.snapshot.queryParams.cat.toLowerCase());

		const query = await this.locationService.searchQuery;

		// Repopulate the category and search query with the previously chosen category and typed query
		if (category && query) {
			this.getLocationsForQuery(query);
			this.search.query = query;
		}
		// Repopulate with previously chosen category
		else if (category) {
			this.getLocationsForCategory(category);
		}
		// Repopulate search-field with previously typed query
		else if (query) {
			this.search.query = query;
			this.getLocationsForQuery(query);
		}
		else {
			this.clearAll();
		}

		// TODO: Select value inside input getting back from details page
		// let input = await document.getElementById('searchInput');
		// input.focus();
		// input.select();
	}

	// Show/hide search hint when focus/blur on input
	searchInFocus(booleanValue) {
		if (this.search.query && this.search.query.length === 1) {
			return;
		}
		this.searchFocus = booleanValue;
		// TODO: Select value inside input when focus
		// if(booleanValue) {
		// 	let input = document.getElementById('searchInput');
		// 	input.select()
		// }
	}

	async getLocationsForCategory(category) {
		if (!category) {
			const solutionName = await this.solutionService.getSolutionName();
			const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
			const routerPath = solutionName + '/' + venueId + '/search';
			this.router.navigate([routerPath.toString()]);
			return;
		}

		this.loading = true;
		this.locationsArray = [];
		this.endOfArray = false;

		// Set category
		this.mapsIndoorsService.setPageTitle(category.name);
		this.search.category = category.name;
		this.category = category;
		this.locationService.setCategory(category);

		// If no existing cat in the URL
		if (!this.route.snapshot.queryParams.cat) {
			this.router.navigate([], { queryParams: { cat: category.name.toLowerCase() } });
		}

		await this.categoryRequest(category).then((locations: any[]) => {
			this.locationsArray = locations && locations.length > 0 ? locations : [];
			this.filtered = true;
			// Set floor for best match
			if (locations.length > 0) this.mapsIndoorsService.setFloor(this.locationsArray[0].properties.floor);
		});
		// Check if empty category
		this.error = this.locationsArray.length < 1 ? "EmptyCategory" : null;
		this.loading = false;

		// Google Analytics
		ga('send', 'event', 'Search page', 'Category list', `${category.categoryKey} was selected`);
	}

	async categoryRequest(category, skip?) {
		const s = skip | 0;
		const parameters = { take: 50, skip: s, venue: this.venue.name, categories: category.categoryKey, orderBy: 'name' };
		const locations = await this.locationService.getLocations(parameters);
		// Display this locations on map
		await this.pushLocationsToMap(locations, skip);
		return locations;
	}

	searchValueChanged(value: string) {
		this.debounceSearch.next(value);
	}

	async getLocationsForQuery(query) {

		// Show hint
		if (query && (query.length < 2 || query === '')) {
			if (!this.search.category) {
				this.error = null;
				this.locationsArray = [];
				this.searchFocus = true;
			}
			else {
				this.getLocationsForCategory(this.category);
			}
			// this.mapsIndoorsService.mapsIndoors.filter(null)
		}
		// Get locations
		else if (query && query.length > 1) {
			const self = this;
			this.loading = true;
			this.error = null;
			this.searchFocus = false;
			this.filtered = true;
			this.locationsArray = [];

			// Clear "get more locations" variables
			this.skip = 0;
			this.endOfArray = false;
			// Set query for later use
			this.previousQuery = query;
			this.locationService.searchQuery = query;
			// Send request
			await this.queryRequest(query).then((locations: any[]) => {
				this.locationsArray = locations && locations.length > 0 ? locations : [];
				// Set floor for best match
				if (locations.length > 0) this.mapsIndoorsService.setFloor(this.locationsArray[0].properties.floor);
			});
			// If locationsArray is empty
			if (this.locationsArray.length < 1) {
				// If no locations for query
				if (!self.category) self.error = "NoResults";
				// If no locations for query in category
				else { self.error = "NoResultsInCategory"; }
			}
			this.loading = false;
		}
		else {
			this.error = null;
			this.clearQuery();
		}
	}

	async queryRequest(query, skip?) {
		const s = skip | 0;
		const parameters = this.category ?
			// If there are a category
			{ q: query, take: 50, skip: s, categories: this.category.categoryKey, orderBy: 'name' } :
			// Else request without
			{ q: query, take: 50, skip: s, orderBy: 'name' };
		const locations = await this.locationService.getLocations(parameters);
		// Display this locations on map
		await this.pushLocationsToMap(locations, skip);
		return locations;
	}

	// Used for showing search results on map
	pushLocationsToMap(locations, skip) {
		const locationsIdArray = [];
		if (locations.length <= 0) {
			return;
		}
		// Only if getting more locations
		else if (skip > 0) {
			// then add the id's of the already existing locations to this local locationsIdArray[] variable
			for (const location of this.locationsArray) {
				locationsIdArray.push(location.id);
			}
		}
		// Push new location id's to locationsIdArray
		for (const location of locations) {
			locationsIdArray.push(location.id);
		}
		// Filter poi's on map based on id's in "locationsIdArray"
		this.mapsIndoorsService.mapsIndoors.filter(locationsIdArray, true);
	}

	// If more than 50 locations, then load next 50 locations on button click
	async getMoreLocations() {
		const query = await this.search.query;
		this.loadingLocations = true;
		let s = this.skip ? this.skip : 50;
		// If searching by a query
		if (query && query.length !== 0) {
			await this.queryRequest(query, s).then((locations: any[]) => {
				if (locations.length <= 0) {
					// No more locations
					this.endOfArray = true;
					return;
				}
				for (const location of locations) {
					this.locationsArray.push(location);
				}
			});
		}
		// If searching only by a category
		else {
			await this.categoryRequest(this.category, s).then((locations: any[]) => {
				if (locations.length <= 0) {
					// No more locations
					this.endOfArray = true;
					return;
				}
				for (const location of locations) {
					this.locationsArray.push(location);
				}
			});
		}
		this.loadingLocations = false;
		this.skip = (s += 50);
	}

	// Clear query
	clearQuery() {
		this.search.query = "";
		this.previousQuery = "";
		this.skip = 0;
		this.locationService.searchQuery = "";
		this.searchFocus = false;
		// If both a category and a query
		if (this.category) {
			this.getLocationsForCategory(this.category);
		}
		else {
			this.clearAll();
		}
	}
	// #endregion

	// #region || ZOOM FOR MORE DETAILS
	async zoomForDetails() {
		const self = this;
		const googleMap = this.googleMapService.googleMap;
		this.zoomBtn = document.getElementById('zoom-for-details');
		const solutionId = await this.solutionService.getSolutionId();

		// Hide the zoom button if the user has visited the app before else show it
		const hideZoomBtnLocalStorage = await localStorage.getItem('MI:' + solutionId + '-hideZoom');
		if (hideZoomBtnLocalStorage === 'true') this.hideZoomBtn();
		else showZoomBtn();

		function showZoomBtn() {
			self.zoomBtn.className = self.zoomBtn.className.replace(' hidden', '');
		}

		// Hides zoom button when clicked
		this.zoomBtnListener = google.maps.event.addDomListenerOnce(this.zoomBtn, 'click', () => {
			googleMap.setZoom(Math.max(18, googleMap.getZoom() + 1));
			self.hideZoomBtn();
		});
		// Hides zoom button when map is dragged
		google.maps.event.addListenerOnce(googleMap, 'dragend', () => {
			self.hideZoomBtn();
		});

		// Remove zoom button when the user zooms
		google.maps.event.addListenerOnce(googleMap, 'idle', () => {
			google.maps.event.addListenerOnce(googleMap, 'zoom_changed', () => {
				self.hideZoomBtn();
			});
		});
	}

	async hideZoomBtn() {
		const solutionId = await this.solutionService.getSolutionId();
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
		if (this.locationsArray.length > 0 || this.filtered) {
			this.clearAll();
			this.mapsIndoorsService.setPageTitle();
			this.mapsIndoorsService.isMapDirty = false;

			const solutionName = await this.solutionService.getSolutionName();
			const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
			const routerPath = solutionName + '/' + venueId + '/search';
			this.router.navigate([routerPath.toString()]);
		}
		// Go back to venues page
		else {
			const solutionId = await this.solutionService.getSolutionId();
			localStorage.removeItem('MI:' + solutionId);
			this.mapsIndoorsService.floorSelector(false);
			this.clearAll();
			this.venueService.favouredVenue = false;
			this.venueService.fitVenues = false;
			const solutionName = await this.solutionService.getSolutionName();
			const routerPath = solutionName + '/venues';
			this.router.navigate([routerPath.toString()]);
			this.mapsIndoorsService.isMapDirty = false;
		}
	}

	clearAll() {
		this.locationsArray = [];
		this.mapsIndoorsService.mapsIndoors.filter(null);
		this.debounceSearch.next(); // Hack to clear previous query
		this.filtered = false;
		this.skip = 0;
		this.error = null;
		this.category = null;
		this.search.category = null;
		this.locationService.clearCategory();
		this.previousQuery = null;
		this.search.query = null;
		this.locationService.searchQuery = null;
		this.loading = false;
	}

	ngOnDestroy() {
		this.hideZoomBtn();
		window["angularComponentRef"] = null;
		// this.mapsIndoorsService.mapsIndoors.filter(null)
		// this.googleMapService.infoWindow.close();
		if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
		if (this.debounceSearchSubscription) this.debounceSearchSubscription.unsubscribe();
		this.clusteredLocationsSubscription.unsubscribe();
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
		this.locationService.clearClusteredLocations();
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
		});

		this.dialogSubscription = this.dialogRef.afterClosed().subscribe(() => {
			const btn = document.getElementById('infoDialogOpenButton');
			btn.classList.remove('cdk-program-focused');
			btn.classList.add('cdk-mouse-focused');
		});
		// Google Analytics
		ga('send', 'event', 'Search page', 'About dialog', 'Open button was clicked for About dialog');
	}
	// #endregion

}
