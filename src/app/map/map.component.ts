import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleMapService } from './../services/google-map.service';
import { MapsIndoorsService } from './../services/maps-indoors.service';
import { LocationService } from './../services/location.service';
import { ThemeService } from './../services/theme.service';
import { DirectionService } from './../services/direction.service';
import { VenueService } from './../services/venue.service';
import { SolutionService } from './../services/solution.service';
import { AppConfigService } from './../services/app-config.service';
import { UserAgentService } from './../services/user-agent.service';
import { NotificationService } from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { TrackerService } from '../services/tracker.service';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { AppMode } from '../shared/enums';

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
    public isKioskMode: boolean;
    private fixedOrigin: Location;
    private initVenue: Venue;

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
        private notificationService: NotificationService,
        private trackerService: TrackerService
    ) { }

    async ngOnInit(): Promise<void> {
        this.appConfigService.getAppConfig()
            .subscribe((appConfig) => this.appConfig = appConfig);
        this.appConfigService.getAppMode()
            .subscribe((mode): void => {
                this.isKioskMode = mode === AppMode.Kiosk ? true : false;
            });
        this.appConfigService.getFixedOrigin()
            .subscribe((fixedOrigin: Location): Location => this.fixedOrigin = fixedOrigin);
        this.appConfigService.getResetView()
            .subscribe((): void => {
                this.resetAppToInitialState();
            });
        this.appConfigService.getInitVenue()
            .subscribe((venue: Venue): void => {
                this.initVenue = venue;
            });
        this.themeService.getThemeColors()
            .subscribe((appConfigColors) => this.colors = appConfigColors);
        this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
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
        await this.googleMapService.initMap();
        await this.mapsIndoorsService.initMapsIndoors();

        this.getVenueFromUrl()
            .then((venue: Venue): void => {
                this.venueService.setVenue(venue, this.appConfig);
                this.mapsIndoorsService.showFloorSelectorAfterUserInteraction();
                this.appConfigService.setInitVenue(venue);

                if (this.route.snapshot.queryParams.origin || this.route.snapshot.queryParams.timeout) {
                    this.appConfigService.setKioskMode();
                }

                if (this.route.snapshot.queryParams.origin) {
                    this.locationService.getLocationById(this.route.snapshot.queryParams.origin)
                        .then((location: Location): void => {
                            this.appConfigService.setFixedOrigin(location);
                            this.focusOnLocation(location);
                            this.mapsIndoorsService.mapsIndoors.setDisplayRule(location.id, {
                                visible: true,
                                icon: '/assets/images/icons/you-are-here.svg',
                                iconVisible: true,
                                label: this.translateService.instant('Direction.YouAreHere'),
                                labelVisible: true,
                                imageSize: new google.maps.Size(40, 40),
                                labelZoomFrom: '0',
                                labelZoomTo: '21',
                                zoomFrom: '0',
                                zoomTo: '22',
                                zIndex: 1000
                            });
                        })
                        .catch((): void => {
                            this.notificationService.displayNotification(
                                this.translateService.instant('Error.IncorrectLocation')
                            );
                        });
                }

                if (this.route.snapshot.queryParams.timeout) {
                    this.appConfigService.setViewTimeout(this.route.snapshot.queryParams.timeout);
                    this.appConfigService.addResetListeners();
                }
            })
            .catch((err): void => {
                this.router.navigate([`${this.solutionService.getSolutionName()}/venues`]);
                if (err === ErrorVenueId.incorrectId) {
                    this.notificationService.displayNotification(
                        this.translateService.instant('Error.IncorrectVenue')
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

    // #region || CLEAR MAP
    clearMap(): void {
        this.googleMapService.closeInfoWindow();
        this.locationService.clearQueryFilter();
        this.locationService.clearCategoryFilter();
        this.mapsIndoorsService.setPageTitle();
        this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
        this.mapsIndoorsService.setVenueAsReturnToValue(this.venue);
        this.mapsIndoorsService.isMapDirty = false;
        this.trackerService.sendEvent('Map', 'Clear map button click', 'Clear map button was clicked', true);
    }

    /**
    * @description Reset app initial state.
    * @memberof MapComponent
    */
    public resetAppToInitialState(): void {
        this.venueService.setVenue(this.initVenue, this.appConfig)
            .then((): void => {
                this.clearMap();

                if (this.fixedOrigin) {
                    this.focusOnLocation(this.fixedOrigin);
                } else {
                    this.mapsIndoorsService.mapsIndoors.fitVenue();
                }
            });
    }

    /**
     * @description Pan and zoom in to location.
     * @private
     * @param {Location} location - The location object to focus at.
     * @param {number} [zoomLevel=19] - Zoom level to set. Defaults to 19.
     * @memberof MapComponent
     */
    private focusOnLocation(location: Location, zoomLevel: number = 19): void {
        this.mapsIndoorsService.setFloor(location.properties.floor);
        this.googleMapService.googleMap.setZoom(zoomLevel);
        this.googleMapService.googleMap.panTo(this.locationService.getAnchorCoordinates(location));
    }
    // #endregion

    // #region || LISTENER || RETURN TO VENUE OR POI
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
        google.maps.event.addListener(this.mapsIndoorsService.mapsIndoors, 'click', (location): void => {
            if (Array.isArray(location)) {
                this.handleClusterClick(location);
                this.trackerService.sendEvent('Map', 'Cluster clicked on map', `"${location[0].properties.type}" type`);
            } else {
                this.handleSingleLocationClick(location);
                this.trackerService.sendEvent('Map', 'Location clicked on map', `"${location.properties.name}" – ${location.id}`);
            }
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
            for (const location of locations) {
                bounds.extend(this.locationService.getAnchorCoordinates(location));
            }
            this.googleMapService.googleMap.fitBounds(bounds);
        }

        // If max zoom then go to search page and list clustered locations
        else {
            this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
            this.locationService.setClusteredLocations(locations);
            this.trackerService.sendEvent('Map', 'Cluster click', 'Clustered locations was clicked', true);
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
        this.trackerService.sendEvent('Map', 'Location click', `${location.properties.name} was clicked`, true);
    }
    // #endregion

    // #region || LISTENER || FLOOR CHANGED
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

