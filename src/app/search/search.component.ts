import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
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
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../services/notification.service';
import { SearchService } from '../directions/components/search/search.service';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { Category } from '../shared/models/category.interface';

declare const ga: Function;

@Component({
	selector: 'app-search',
	templateUrl: './search.component.html',
	styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
	appConfig: any;
	colors: object;
	categoriesMenu: any;
	venue: any;
	SearchHintAppTitle: string = '';

	previousQuery: string = ''
	category: any;
	error: string;
	search: any = {
		query: null,
		category: null
	};
	locationsArray: Location[] = [];
	filtered: boolean = false;
	clusteredLocationsSubscription: Subscription;
	searchFocus: boolean = false;
	loading: boolean = false;

	skip: any;
	loadingLocations: boolean = false;
	endOfArray: boolean = false;

	zoomBtn: HTMLElement;
	zoomBtnListener: google.maps.MapsEventListener;

	debounceSearch: Subject<string> = new Subject<string>();
	debounceSearchSubscription: Subscription;

	categorySubscription: Subscription;

	dialogSubscription: Subscription;
	dialogRef: MatDialogRef<InfoDialogComponent>;
	public appVersion: string = environment.v;
	appConfigSubscription: Subscription;
	themeServiceSubscription: Subscription;
	venueSubscription: Subscription;

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
		private notificationService: NotificationService,
		private translateService: TranslateService,
		private searchService: SearchService
	) {
		this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		this.debounceSearchSubscription = this.debounceSearch
			.pipe(debounceTime(500)) // wait XX ms after the last event before emitting last event
			.pipe(distinctUntilChanged()) // only emit if value is different from previous value
			.subscribe((value) => {
				this.getLocationsForQuery(value);
			});

		this.clusteredLocationsSubscription = this.locationService.getClusteredLocations()
			.subscribe((locations) => {
				if (locations.length > 0) {
					this.locationsArray = locations;
					this.filtered = true;
				}
			});
	}

	ngOnInit(): void {
		this.venueSubscription = this.venueService.getVenueObservable().subscribe((venue: Venue) => {
			if (venue && venue.id) {
				this.venue = venue;
				this.zoomForDetails();
				this.getPreviousFiltering();
			}
		});
		// await this.getClusteredLocations();
		this.SearchHintAppTitle = this.appConfig.appSettings.title;
		this.categoriesMenu = this.appConfig.menuInfo.mainmenu;
		window['angularComponentRef'] = { component: this, zone: this._ngZone };
	}

	// #region || SEARCH AND RESULTS

	/**
	 * @description Setting the selected location.
	 * @param {Location} location
	 * @memberof SearchComponent
	 */
	setLocation(location: Location): void {
		this.locationsArray = [];
		this.loading = true;
		this.locationService.setLocation(location)
			.then(() => {
				this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/details/${location.id}`]);
			})
			.catch((err) => {
				this.notificationService.displayNotification(err);
				this.loading = false;
			});
	}

	// getClusteredLocations() {
	// 	return new Promise((resolve, reject) => {
	// 		this.locationService.getClusteredLocations().then((locations: any) => {
	// 			for (let location of locations) this.locationsArray.push(location);
	// 			resolve();
	// 		});
	// 	})
	// }

	/**
	 * @description Get the previous category and query filtering.
	 * @private
	 * @returns {void}
	 * @memberof SearchComponent
	 */
	private getPreviousFiltering(): void {
		const category: Category = this.getCategoryFromUrl();
		const query = this.locationService.getQueryFilter();

		// No filtering
		if (!category && !query) {
			return;
		}

		// Filter by query
		if (!category) {
			this.search.query = query;
			this.getLocationsForQuery(query);
			return;
		}

		// Filter by category and query as well if any
		this.getLocationsForCategory(category)
			.then(() => {
				if (query) {
					this.getLocationsForQuery(query);
				}
			});
		this.search.query = query;
	}

	/**
	 * @description Get Category object from URL parameter.
	 * @private
	 * @returns {Category} - The category to filter by.
	 * @memberof SearchComponent
	 */
	private getCategoryFromUrl(): Category {
		const categorySnapshot = this.route.snapshot.queryParams.cat;
		if (categorySnapshot) {
			return this.appConfig.menuInfo.mainmenu
				.find((category: Category) => category.categoryKey.toLowerCase() === categorySnapshot.toLowerCase());
		}
	}

	// Show/hide search hint when focus/blur on input
	searchInFocus(booleanValue): void {
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

	/**
	 * @description Populates the LocationsArray property with locations for the given category.
	 * @param {Category} category - The category to filter by.
	 * @returns {Promise<void>}
	 * @memberof SearchComponent
	 */
	public getLocationsForCategory(category: Category): Promise<void> {
		return new Promise((resolve, reject) => {
			this.loading = true;
			this.locationsArray = [];
			this.endOfArray = false;

			// Update category properties
			this.search.category = category.name;
			this.category = category;
			this.locationService.setCategoryFilter(category);

			this.mapsIndoorsService.setPageTitle(category.name);
			// Update the category URL parameter
			if (!this.route.snapshot.queryParams.cat) {
				this.router.navigate([], { queryParams: { cat: category.categoryKey.toLowerCase() } });
			}

			this.categoryRequest(category.categoryKey)
				.then((locations: Location[]) => {
					this.filtered = true;
					if (locations.length === 0) {
						this.error = 'EmptyCategory';
						this.loading = false;
						resolve();
						return;
					}
					this.locationsArray = locations;
					this.pushLocationsToMap(locations);
					// Set floor for best match
					this.mapsIndoorsService.setFloor(this.locationsArray[0].properties.floor);
					this.loading = false;
					resolve();
				})
				.catch(() => {
					this.loading = false;
					this.notificationService.displayNotification(
						this.translateService.instant('Error.General')
					);
					reject();
				});
			// Google Analytics
			ga('send', 'event', 'Search page', 'Category list', `${category.name} was selected`);
		});
	}

	/**
	 * @description Get 50 locations for a category.
	 * @param {string} categoryKey - The category key to search for locations within.
	 * @param {number} [locationsToSkip=0] - Amount of locations to request.
	 * @returns {Promise<Location[]>} - Returns 50 locations.
	 * @memberof SearchComponent
	 */
	categoryRequest(categoryKey: string, locationsToSkip: number = 0): Promise<Location[]> {
		return this.searchService.getLocations(
			{
				take: 50,
				skip: locationsToSkip,
				venue: this.venue.name,
				categories: categoryKey,
				orderBy: 'name'
			});
	}

	searchValueChanged(value: string): void {
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
			this.locationService.setQueryFilter(query);
			// Send request
			await this.queryRequest(query).then((locations: any[]) => {
				this.locationsArray = locations && locations.length > 0 ? locations : [];
				// Set floor for best match
				if (locations.length > 0) this.mapsIndoorsService.setFloor(this.locationsArray[0].properties.floor);
			});
			// If locationsArray is empty
			if (this.locationsArray.length < 1) {
				// If no locations for query
				if (!self.category) self.error = 'NoResults';
				// If no locations for query in category
				else { self.error = 'NoResultsInCategory'; }
			}
			this.loading = false;
		}
		else {
			this.error = null;
			this.clearQuery(false);
		}
	}

	async queryRequest(query, skip: number = 0) {
		const parameters = this.category ?
			// If there are a category
			{ q: query, take: 50, skip: skip, categories: this.category.categoryKey, orderBy: 'name' } :
			// Else request without
			{ q: query, take: 50, skip: skip, orderBy: 'name' };
		const locations = await this.searchService.getLocations(parameters);
		// Display this locations on map
		await this.pushLocationsToMap(locations, skip);
		return locations;
	}

	// Used for showing search results on map
	pushLocationsToMap(locations: Location[], skip: number = 0): void {
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
		let locationsToSkip = this.skip ? this.skip : 50;
		// If searching by a query
		if (query && query.length !== 0) {
			await this.queryRequest(query, locationsToSkip)
				.then((locations: Location[]) => {
					if (locations.length === 0) {
						this.endOfArray = true;
						return;
					}
					this.locationsArray.push(...locations);
				});
		}
		// If searching only by a category
		else {
			await this.categoryRequest(this.category.categoryKey, locationsToSkip)
				.then((locations: Location[]) => {
					if (locations.length === 0) {
						this.endOfArray = true;
						return;
					}
					this.pushLocationsToMap(locations);
					this.locationsArray.push(...locations);
				});
		}
		this.loadingLocations = false;
		this.skip = (locationsToSkip += 50);
	}

	// Clear query
	clearQuery(fitView = true): void {
		this.search.query = '';
		this.previousQuery = '';
		this.skip = 0;
		this.locationService.clearQueryFilter();
		this.searchFocus = false;
		this.error = null;
		// If both a category and a query
		if (this.category) {
			this.getLocationsForCategory(this.category);
		}
		else {
			this.clearAll(fitView);
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
		if (this.locationsArray.length > 0 || this.filtered) {
			this.clearAll();
			this.mapsIndoorsService.setPageTitle();
			this.mapsIndoorsService.isMapDirty = false;

			const solutionName = await this.solutionService.getSolutionName();
			this.router.navigate([`${solutionName}/${this.venue.id}/search`]);
		}
		// Go back to venues page
		else {
			const solutionId = await this.solutionService.getSolutionId();
			localStorage.removeItem('MI:' + solutionId);
			this.mapsIndoorsService.hideFloorSelector();
			this.clearAll();
			this.venueService.favouredVenue = false;
			this.venueService.fitVenues = false;
			const solutionName = await this.solutionService.getSolutionName();
			this.router.navigate([`${solutionName}/venues`]);
			this.mapsIndoorsService.isMapDirty = false;
		}
	}

	clearAll(fitView = true): void {
		this.locationsArray = [];
		if (this.mapsIndoorsService.mapsIndoors) this.mapsIndoorsService.mapsIndoors.filter(null, fitView);
		this.debounceSearch.next(); // Hack to clear previous query
		this.filtered = false;
		this.skip = 0;
		this.error = null;
		this.category = null;
		this.search.category = null;
		this.locationService.clearCategoryFilter();
		this.previousQuery = null;
		this.search.query = null;
		this.locationService.clearQueryFilter();
		this.loading = false;
	}

	ngOnDestroy(): void {
		if (this.zoomBtn) this.hideZoomBtn();
		window['angularComponentRef'] = null;
		// this.mapsIndoorsService.mapsIndoors.filter(null)
		// this.googleMapService.infoWindow.close();
		if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
		if (this.debounceSearchSubscription) this.debounceSearchSubscription.unsubscribe();
		this.clusteredLocationsSubscription.unsubscribe();
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
		this.venueSubscription.unsubscribe();
		this.locationService.clearClusteredLocations();
	}
	// #endregion

	// #region || DIALOG || INFO
	openInfoDialog(): void {
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
