import { Component, OnInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { Router, ActivatedRoute, Params } from '@angular/router';
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
import { TrackerService } from '../services/tracker.service';
import { UserAgentService } from '../services/user-agent.service';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { Category } from '../shared/models/category.interface';
import { SearchParameters } from '../shared/models/searchParameters.interface';
import { CategoryService } from '../services/category.service';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
    appConfig: any;
    colors: object;
    categoriesMenu: any;

    venue: Venue;
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
    searchFocus: boolean = false;
    loading: boolean = false;

    loadingLocations: boolean = false;
    endOfArray: boolean = false;

    zoomBtn: HTMLElement;
    zoomBtnListener: google.maps.MapsEventListener;

    debounceSearch: Subject<string> = new Subject<string>();
    debounceSearchSubscription: Subscription;

    private subscriptions = new Subscription();
    private urlParameters: Params;
    categorySubscription: Subscription;

    dialogSubscription: Subscription;
    dialogRef: MatDialogRef<InfoDialogComponent>;
    public appVersion: string = environment.v;
    appConfigSubscription: Subscription;
    themeServiceSubscription: Subscription;

    // TODO: Should be moved into search component when implemented.
    @HostListener('document:keydown.enter', ['$event'])
    onKeydownHandler(): void {
        if (this.search.query) {
            this.trackerService.sendEvent('Search', 'Pressed "Enter" key', `"${this.search.query}" search query`);
        }
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public _ngZone: NgZone,
        private solutionService: SolutionService,
        private appConfigService: AppConfigService,
        private categoryService: CategoryService,
        private venueService: VenueService,
        private googleMapService: GoogleMapService,
        private locationService: LocationService,
        private mapsIndoorsService: MapsIndoorsService,
        private dialog: MatDialog,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private translateService: TranslateService,
        private searchService: SearchService,
        private trackerService: TrackerService,
        private userAgentService: UserAgentService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
        this.debounceSearchSubscription = this.debounceSearch
            .pipe(debounceTime(500)) // wait XX ms after the last event before emitting last event
            .pipe(distinctUntilChanged()) // only emit if value is different from previous value
            .subscribe((value) => {
                this.getLocationsForQuery(value);
            });
    }

    ngOnInit(): void {
        this.subscriptions
            // Route Observable
            .add(this.route.queryParams
                .subscribe((params: Params): void => {
                    this.urlParameters = params;
                })
            )
            // Venue observable
            .add(this.venueService.getVenueObservable()
                .subscribe((venue: Venue): void => {
                    this.venue = venue;
                    this.zoomForDetails();
                    this.getPreviousFiltering();
                    this.panIfWithinBounds();
                })
            )
            .add(this.categoryService.getMainMenuCategoriesObservable()
                .subscribe((categories: Category[]): void => {
                    this.categoriesMenu = categories;
                })
            );

        this.SearchHintAppTitle = this.appConfig.appSettings.title;
        window['angularComponentRef'] = { component: this, zone: this._ngZone };
    }

    // #region || SEARCH AND RESULTS

    /**
     * @description Setting the selected location.
     * @param {Location} location
     * @memberof SearchComponent
     */
    public setLocation(location: Location): void {
        this.locationsArray = [];
        this.loading = true;
        this.locationService.setLocation(location);
        this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/details/${location.id}`]);
        this.trackerService.sendEvent('Search', 'Selected Location in search results list',
            `"${location.properties.name}" – ${location.id} ${this.search.query ? `("${this.search.query}" search query)` : ''}`);
    }

    /**
     * @description Get the previous category and query filtering.
     * @private
     * @returns {void}
     * @memberof SearchComponent
     */
    private getPreviousFiltering(): void {
        let category: Category;
        if (this.urlParameters && this.urlParameters.cat) {
            category = this.appConfig.menuInfo.mainmenu
                .find((category: Category) => category.categoryKey.toLowerCase() === this.urlParameters.cat.toLowerCase());
        }
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
            .then((): void => {
                if (query) {
                    this.getLocationsForQuery(query);
                }
            });
        this.search.query = query;
    }

    /**
     * Pan to current position if it is within venue bounds.
     */
    private panIfWithinBounds(): void {
        const bbox = this.venue.geometry.bbox;
        const bounds = new google.maps.LatLngBounds({ lat: bbox[1], lng: bbox[0] }, { lat: bbox[3], lng: bbox[2] });
        this.userAgentService.panToPositionIfWithinBounds(bounds);
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
    public getLocationsForCategory(category: Category, clickEvent?): Promise<void> {
        return new Promise((resolve, reject): void => {
            this.loading = true;
            this.locationsArray = [];
            this.endOfArray = false;

            // Update category properties
            this.search.category = category.name;
            this.category = category;
            this.locationService.setCategoryFilter(category);

            this.mapsIndoorsService.setPageTitle(category.name);
            // Update the category URL parameter
            this.router.navigate([], { queryParams: { cat: category.categoryKey.toLowerCase() } });

            this.categoryRequest(category.categoryKey)
                .then((locations: Location[]): void => {
                    this.filtered = true;
                    if (locations.length === 0) {
                        this.error = 'EmptyCategory';
                        this.loading = false;
                        resolve();
                        return;
                    }
                    this.locationsArray = locations;
                    this.mapsIndoorsService.setMapFilter(this.locationsArray);

                    this.loading = false;
                    resolve();
                })
                .catch((): void => {
                    this.loading = false;
                    this.notificationService.displayNotification(
                        this.translateService.instant('Error.General')
                    );
                    reject();
                });
            if (clickEvent) {
                this.trackerService.sendEvent('Categories', 'Selected Category', `"${category.name}" – ${category.categoryKey}`);
            }
        });
    }

    /**
     * @description Get locations for a category.
     * @private
     * @param {string} categoryKey - The category key to search for locations within.
     * @returns {Promise<Location[]>} - Array of 50 locations or less.
     * @memberof SearchComponent
     */
    private categoryRequest(categoryKey: string): Promise<Location[]> {
        const parameters: SearchParameters = {
            take: 50,
            skip: this.locationsArray.length,
            venue: this.venue.name,
            categories: [categoryKey],
            orderBy: 'relevance',
        };
        parameters.near = `venue:${this.venue.id}`;
        return this.searchService.getLocations(parameters);
    }

    searchValueChanged(value: string): void {
        this.debounceSearch.next(value);
    }

    async getLocationsForQuery(query): Promise<void> {
        // Show hint
        if (query && (query.length < 2 || query === '')) {
            if (!this.search.category) {
                this.error = null;
                this.locationsArray = [];
                this.searchFocus = true;
            } else {
                this.getLocationsForCategory(this.category);
            }
        } else if (query && query.length > 1) {
            // Get locations
            this.loading = true;
            this.error = null;
            this.searchFocus = false;
            this.filtered = true;
            this.locationsArray = [];

            // Clear "get more locations" variables
            this.endOfArray = false;
            // Set query for later use
            this.previousQuery = query;
            this.locationService.setQueryFilter(query);
            // Send request
            await this.queryRequest(query)
                .then((locations: Location[]): void => {
                    if (locations.length === 0) {
                        this.error = this.category ? 'NoResultsInCategory' : 'NoResults';
                        this.loading = false;
                    }
                    this.locationsArray = locations && locations.length > 0 ? locations : [];
                    this.mapsIndoorsService.setMapFilter(this.locationsArray);
                });
            this.loading = false;
        } else {
            this.error = null;
            this.clearQuery();
        }
    }

    /**
     * @description Get locations for a query.
     * @private
     * @param {string} query - The search query.
     * @returns {Promise<Location[]>} - Array of 50 locations or less.
     * @memberof SearchComponent
     */
    private queryRequest(query: string): Promise<Location[]> {
        const parameters: SearchParameters = {
            q: query,
            fields: 'name,description,aliases,categories,externalId',
            take: 50,
            skip: this.locationsArray.length,
            orderBy: 'relevance',
        };
        parameters.near = `venue:${this.venue.id}`;
        if (this.category) {
            parameters.categories = [this.category.categoryKey];
        }

        return this.searchService.getLocations(parameters);
    }

    /**
     * @description Get more locations for entered query and or selected category.
     * @returns {Promise<void>}
     * @memberof SearchComponent
     */
    async getMoreLocations(): Promise<void> {
        this.loadingLocations = true;
        let locations: Location[];

        // Query search
        if (this.search.query && this.search.query.length !== 0) {
            locations = await this.queryRequest(this.search.query);
        } else {
            // Category search
            locations = await this.categoryRequest(this.category.categoryKey);
        }

        if (locations.length === 0) {
            this.endOfArray = true;
            return;
        }
        this.locationsArray.push(...locations);
        this.mapsIndoorsService.setMapFilter(this.locationsArray);

        this.loadingLocations = false;
    }

    // Clear query
    clearQuery(): void {
        this.search.query = '';
        this.previousQuery = '';
        this.locationService.clearQueryFilter();
        this.searchFocus = false;
        this.error = null;
        // If both a category and a query
        if (this.category) {
            this.getLocationsForCategory(this.category);
        } else {
            this.clearAll();
        }
    }
    // #endregion

    // #region || ZOOM FOR MORE DETAILS
    async zoomForDetails(): Promise<void> {
        const self = this;
        const googleMap = this.googleMapService.map;
        this.zoomBtn = document.getElementById('zoom-for-details');
        const solutionId = await this.solutionService.getSolutionId();

        // Hide the zoom button if the user has visited the app before else show it
        const hideZoomBtnLocalStorage = this.userAgentService.localStorage.getItem('MI:' + solutionId + '-hideZoom');
        if (hideZoomBtnLocalStorage === 'true') this.hideZoomBtn();
        else showZoomBtn();

        function showZoomBtn(): void {
            self.zoomBtn.className = self.zoomBtn.className.replace(' hidden', '');
        }

        // Hides zoom button when clicked
        this.zoomBtnListener = google.maps.event.addDomListenerOnce(this.zoomBtn, 'click', (): void => {
            googleMap.setZoom(Math.max(18, googleMap.getZoom() + 1));
            self.hideZoomBtn();
        });
        // Hides zoom button when map is dragged
        google.maps.event.addListenerOnce(googleMap, 'dragend', (): void => {
            self.hideZoomBtn();
        });

        // Remove zoom button when the user zooms
        google.maps.event.addListenerOnce(googleMap, 'idle', (): void => {
            this.mapsIndoorsService.mapsIndoors.addListener('zoom_changed', (): void => {
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
        this.userAgentService.localStorage.setItem('MI:' + solutionId + '-hideZoom', 'true');
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
        } else {
            // Go back to venues page
            const solutionId = await this.solutionService.getSolutionId();
            this.userAgentService.localStorage.removeItem('MI:' + solutionId);
            this.mapsIndoorsService.hideFloorSelector();
            this.clearAll();
            this.venueService.favouredVenue = false;
            this.venueService.fitVenues = false;
            const solutionName = await this.solutionService.getSolutionName();
            this.router.navigate([`${solutionName}/venues`]);
            this.mapsIndoorsService.isMapDirty = false;
        }
    }

    clearAll(): void {
        this.urlParameters = null;
        this.locationsArray = [];
        if (this.mapsIndoorsService.mapsIndoors) this.mapsIndoorsService.clearMapFilter();
        this.debounceSearch.next(); // Hack to clear previous query
        this.filtered = false;
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
        if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
        if (this.debounceSearchSubscription) this.debounceSearchSubscription.unsubscribe();
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
        this.subscriptions.unsubscribe();
    }
    // #endregion

    // #region || DIALOG || INFO
    openInfoDialog(): void {
        this.dialogRef = this.dialog.open(InfoDialogComponent, {
            width: '500px',
            autoFocus: false,
            disableClose: false,
            data: {
                appTitle: this.appConfig.appSettings.title,
                appVersion: this.appVersion,
                sdkVersion: this.mapsIndoorsService.mapsIndoors.__VERSION__
            }
        });

        this.dialogSubscription = this.dialogRef.afterClosed()
            .subscribe((): void => {
                this.trackerService.sendEvent('Search page', 'About dialog', 'Close button was clicked for About dialog', true);
            });
        this.trackerService.sendEvent('Search page', 'About dialog', 'Open button was clicked for About dialog', true);
    }
    // #endregion

}
