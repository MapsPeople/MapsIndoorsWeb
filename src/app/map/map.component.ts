import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleMapService } from './../services/google-map.service';
import { MapsIndoorsService, FitSelectionInfo } from './../services/maps-indoors.service';
import { LocationService } from './../services/location.service';
import { ThemeService } from './../services/theme.service';
import { VenueService } from './../services/venue.service';
import { SolutionService } from './../services/solution.service';
import { AppConfigService } from './../services/app-config.service';
import { UserAgentService } from './../services/user-agent.service';
import { NotificationService } from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { TrackerService } from '../services/tracker.service';

import { Location, Venue } from '@mapsindoors/typescript-interfaces';
import { LiveDataService } from '@mapsindoors/web-shared';
import { PrintControl } from '../controls/print.control';

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
    statusOk = false;
    appConfig: any;
    colors: object;
    venue: Venue;
    pageTitle: string;

    private location: Location;
    private initVenue: Venue;
    private printControlElement: PrintControl;

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
        private venueService: VenueService,
        private translateService: TranslateService,
        private notificationService: NotificationService,
        private trackerService: TrackerService,
        private liveDataService: LiveDataService
    ) { }

    async ngOnInit(): Promise<void> {
        this.appConfigService.getAppConfig()
            .subscribe((appConfig) => this.appConfig = appConfig);

        this.appConfigService.getInitVenue()
            .subscribe((venue: Venue): void => {
                this.initVenue = venue;
            });
        this.themeService.getThemeColors()
            .subscribe((appConfigColors) => this.colors = appConfigColors);
        this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
                this.venue = venue;

                const venueBounds = this.venueService.getVenueBoundingBox(venue);
                this.mapsIndoorsService.initFitSelectionControl(venueBounds);

                const currentSelectionInfo: FitSelectionInfo = {
                    name: venue.venueInfo.name,
                    coordinates: new google.maps.LatLng(venue.anchor.coordinates[1], venue.anchor.coordinates[0]),
                    isVenue: true
                };
                this.mapsIndoorsService.setFitSelectionInfo(currentSelectionInfo);
            });
        this.locationService.getCurrentLocation()
            .subscribe((location: Location) => this.location = location);
        this.mapsIndoorsService.getCurrentPageTitle()
            .subscribe((title: string) => this.pageTitle = title);
        this.userAgentService.isHandset()
            .subscribe((value: boolean) => this.isHandset = value);
        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();

        await this.googleMapService.initMapView();
        await this.mapsIndoorsService.initMapsIndoors();

        this.liveDataService.enableLiveData(this.mapsIndoorsService.mapsIndoors);
        this.mapsIndoorsService.notifyLiveDataManagerObservers();

        this.getVenueFromUrl()
            .then((venue: Venue): void => {
                this.venueService.setVenue(venue, this.appConfig);
                this.mapsIndoorsService.showFloorSelectorAfterUserInteraction();
                this.appConfigService.setInitVenue(venue);
            })
            .catch((err): void => {
                this.router.navigate([`${this.solutionService.getSolutionName()}/venues`]);
                if (err === ErrorVenueId.incorrectId) {
                    this.notificationService.displayNotification(
                        this.translateService.instant('Error.IncorrectVenue')
                    );
                }
            });
        this.themeService.setColors();
        this.addLocationListener();
        this.addFloorChangedListener();

        this.addPrintControl();
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
            } else reject(id ?
                ErrorVenueId.incorrectId :
                ErrorVenueId.undefinedId
            );
        });
    }

    /**
     * Add print control element to map.
     *
     * @private
     */
    private addPrintControl(): void {
        this.printControlElement = new PrintControl(this.googleMapService.map, this.translateService.instant('Buttons.PrintMap'));
        this.printControlElement.add(google.maps.ControlPosition.RIGHT_TOP);
    }

    // #region || CLEAR MAP
    clearMap(): void {
        this.googleMapService.closeInfoWindow();
        this.locationService.clearQueryFilter();
        this.locationService.clearCategoryFilter();
        this.mapsIndoorsService.setPageTitle();
        this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);

        const currentSelectionInfo: FitSelectionInfo = {
            name: this.venue.venueInfo.name,
            coordinates: new google.maps.LatLng(this.venue.anchor.coordinates[1], this.venue.anchor.coordinates[0]),
            isVenue: true
        };
        this.mapsIndoorsService.setFitSelectionInfo(currentSelectionInfo);

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
                this.mapsIndoorsService.mapsIndoors.fitVenue();
            });
    }

    // #endregion

    // #region || LISTENER || LOCATION CLICK
    /**
     * Adding a listener for clicks on locations
     * @listens event:click
     */
    addLocationListener(): void {
        this.mapsIndoorsService.mapsIndoors.addListener('click', (location): void => {
            this.handleSingleLocationClick(location);
            this.trackerService.sendEvent('Map', 'Location clicked on map', `"${location.properties.name}" – ${location.id}`);
        });
    }

    /**
     * Navigating to details page when a single location are clicked on the map.
     * @param location	The clicked location.
     */
    handleSingleLocationClick(location: Location): void {
        let venue: Venue;
        this.locationService.setLocation(location);

        /** Make sure venue is set whenever clicking on a location */
        if (this.venue) {
            venue = this.venue;
        } else {
            this.venueService.getVenues().then((venues: Venue[]) => {
                const locationVenue = venues.find((venue: Venue) => venue.name === location.properties.venue);
                // Set venue and override default floor by setting it explicitly
                this.venueService.setVenue(locationVenue, this.appConfig, false);
                this.mapsIndoorsService.setFloor(location.properties.floor);
                venue = locationVenue;
            });
        }

        if (venue) {
            this.router.navigate([`${this.solutionService.getSolutionName()}/${venue.id}/details/${location.id}`]);
        }

        this.trackerService.sendEvent('Map', 'Location click', `${location.properties.name} was clicked`, true);
    }
    // #endregion

    // #region || LISTENER || FLOOR CHANGED
    /**
     * Add "floor_changed" listener and handle highlight of selected location on change.
     */
    addFloorChangedListener(): void {
        this.mapsIndoorsService.mapsIndoors.addListener('floor_changed', (): void => {
            const routeSnapshot = this.route.children[0].snapshot;

            if (this.location && routeSnapshot && routeSnapshot.routeConfig.component.name === 'DetailsComponent') {
                const locationFloor: string = this.location.properties.floor;
                if (locationFloor !== this.mapsIndoorsService.mapsIndoors.getFloor()) {
                    this.googleMapService.closeInfoWindow();
                    // Remove location polygon
                    this.locationService.clearLocationPolygonHighlight();
                } else {
                    this.googleMapService.openInfoWindow();
                    // Set location polygon
                    this.locationService.highlightLocationPolygon(this.location.id);
                }
            }
        });
    }
    // #endregion
}

