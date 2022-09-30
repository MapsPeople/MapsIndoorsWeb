import { Component, OnInit, OnDestroy, NgZone, ViewChild, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenav } from '@angular/material/sidenav';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../services/app-config.service';
import { UserAgentService } from '../../services/user-agent.service';
import { MapsIndoorsService, FitSelectionInfo } from '../../services/maps-indoors.service';
import { GoogleMapService } from '../../services/google-map.service';
import { LocationService } from '../../services/location.service';
import { VenueService } from '../../services/venue.service';
import { ThemeService } from '../../services/theme.service';
import { Subject, Subscription } from 'rxjs';
import { SolutionService } from '../../services/solution.service';
import { SearchComponent } from '../components/search/search.component';
import { NotificationService } from '../../services/notification.service';
import { TrackerService } from 'src/app/services/tracker.service';
import { UnitSystem } from '../../shared/enums';

import { AppConfig, Location, SearchParameters, Solution, Venue } from '@mapsindoors/typescript-interfaces';
import { SearchData } from '../components/search/searchData.interface';
import { Step } from '@mapsindoors/components/dist/types/types/step.interface';
import { Leg } from '@mapsindoors/components/dist/types/types/leg.interface';
import { StepSwitcherControl } from 'src/app/controls/step-switcher.control';
import { UserPosition } from '../components/user-position/user-position.component';

declare const mapsindoors: any;

@Component({
    selector: 'app-directions',
    templateUrl: './directions.component.html',
    styleUrls: ['./directions.component.scss']
})
export class DirectionsComponent implements OnInit, OnDestroy {
    isInternetExplorer: boolean;
    isHandset: boolean;
    isViewActive: boolean;

    searchInputFieldHasFocus = false;
    error: string;
    colors: any;
    loading = true;
    private solution: Solution;
    appConfig: AppConfig;
    venue: Venue;
    public venuesLength: number;

    useBrowserPositioning: boolean;
    currentPositionVisible = true;

    travelMode: string = sessionStorage.getItem('TRAVEL_MODE') || 'WALKING';
    avoidStairs = false;

    currentInputField: string;

    geoCodingService = new google.maps.Geocoder()

    miGeoCodeService = mapsindoors.services.GeoCodeService;
    private miDirectionsService; // Hold instance of mapsindoors DirectionsService
    private miDirectionsRenderer; // Hold instance of mapsindoors DirectionsRenderer

    public searchParameters: SearchParameters = {
        take: 10,
    };
    public searchCountryCodeRestrictions: string | string[];
    searchResults = [];
    isPoweredByGoogle = false;
    originLocation: Location | UserPosition;

    originInputValue: string;
    @ViewChild('originSearchComponent') originSearchComponent: SearchComponent;
    destinationLocation: Location | UserPosition;
    destinationInputValue: string;
    @ViewChild('destinationSearchComponent') destinationSearchComponent: SearchComponent;

    debounceSearchOrigin: Subject<string> = new Subject<string>();
    debounceSearchDestination: Subject<string> = new Subject<string>();

    unit: UnitSystem;
    showAgencyInfo = false;

    transitAgencies = [];

    totalTravelDuration: number;
    totalTravelDistance: number;

    @ViewChild('routeInstructions') routeInstructionsComponent: ElementRef<HTMLMiRouteInstructionsElement>;

    public flattenedStepsArrayIndex = 0;
    public flattenedStepsArray: Step[] = [];

    private stepSwitcherMapControl: StepSwitcherControl;
    private handleStepIndexChanged: (event: CustomEvent<any>) => void;

    subscriptions = new Subscription();

    isHandsetSubscription: Subscription;
    originSearchSubscription: Subscription;
    destinationSearchSubscription: Subscription;
    appConfigSubscription: Subscription;
    themeServiceSubscription: Subscription;

    public directionsResponse;

    public instructionsTranslations = {
        walk: this.translateService.instant('DirectionRoute.Walk'),
        bike: this.translateService.instant('DirectionRoute.Ride'),
        transit: this.translateService.instant('DirectionRoute.Transit'),
        drive: this.translateService.instant('DirectionRoute.Drive'),
        leave: this.translateService.instant('DirectionRoute.Leave'),
        from: this.translateService.instant('Direction.From'),
        park: this.translateService.instant('DirectionRoute.Park'),
        at: this.translateService.instant('DirectionRoute.at'),
        building: this.translateService.instant('DirectionRoute.Building'),
        venue: this.translateService.instant('DirectionRoute.Venue'),
        takeStaircaseToLevel: this.translateService.instant('DirectionRoute.TakeStaircaseToLevel'),
        takeElevatorToLevel: this.translateService.instant('DirectionRoute.TakeElevatorToLevel'),
        takeLadderToLevel: this.translateService.instant('DirectionRoute.TakeLadderToLevel'),
        takeWheelchairLiftToLevel: this.translateService.instant('DirectionRoute.TakeWheelchairLiftToLevel'),
        takeWheelchairRampToLevel: this.translateService.instant('DirectionRoute.TakeWheelchairRampToLevel'),
        takeEscalatorToLevel: this.translateService.instant('DirectionRoute.TakeEscalatorToLevel'),
        exit: this.translateService.instant('DirectionRoute.Exit'),
        enter: this.translateService.instant('DirectionRoute.Enter'),
        stops: this.translateService.instant('DirectionRoute.Stops'),
        andContinue: this.translateService.instant('DirectionRoute.andContinue'),
        continueStraightAhead: this.translateService.instant('DirectionRoute.Straight'),
        goLeft: this.translateService.instant('DirectionRoute.TurnLeft'),
        goSharpLeft: this.translateService.instant('DirectionRoute.TurnSharpLeft'),
        goSlightLeft: this.translateService.instant('DirectionRoute.TurnSlightLeft'),
        goRight: this.translateService.instant('DirectionRoute.TurnRight'),
        goSharpRight: this.translateService.instant('DirectionRoute.TurnSharpRight'),
        goSlightRight: this.translateService.instant('DirectionRoute.TurnSlightRight'),
        turnAround: this.translateService.instant('DirectionRoute.TurnAround'),
        days: this.translateService.instant('DirectionRoute.Days'),
        hours: this.translateService.instant('DirectionRoute.Hours'),
        minutes: this.translateService.instant('DirectionRoute.Minutes')
    };

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
        private notificationService: NotificationService,
        private trackerService: TrackerService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => {
            this.appConfig = appConfig;
            this.searchCountryCodeRestrictions = appConfig.appSettings.countryCode || '';
        });
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);

        this.isHandsetSubscription = this.userAgentService.isHandset()
            .subscribe((value: boolean): void => {
                this.isHandset = value;

                // Add Step Switcher Control element to map if route is presented and device is handset
                if (this.isHandset && this.directionsResponse) {
                    this.addStepSwitcherMapControl(this.flattenedStepsArray);
                } else if (this.stepSwitcherMapControl) { // Remove Step Switcher Control element from map if device no longer is handset
                    this.removeStepSwitcherMapControl();
                }
            });
    }

    /**
     * Get instance of mapsindoors.services.DirectionsService.
     */
    get directionService(): any {
        if (!this.miDirectionsService) {
            const externalDirections = new mapsindoors.directions.GoogleMapsProvider();
            this.miDirectionsService = new mapsindoors.services.DirectionsService(externalDirections);
        }

        return this.miDirectionsService;
    }

    /**
     * Get instance of mapsindoors.directions.DirectionsRenderer.
     */
    get directionsRendererInstance(): any {
        if (!this.miDirectionsRenderer) {
            this.miDirectionsRenderer = new mapsindoors.directions.DirectionsRenderer({
                mapsIndoors: this.mapsIndoorsService.mapsIndoors
            });
        }
        return this.miDirectionsRenderer;
    }

    /*
     * Listen for clicks on the <mi-route-instructions> component and
     * set the leg and step accordingly.
     */
    @HostListener('clicked', ['$event'])
    private onInstructionsClicked(event): void {
        if (typeof event.detail.legIndex === 'number') {
            this.setActiveStep(event.detail.stepIndex, event.detail.legIndex);
        }
    }

    ngOnInit(): void {
        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
        this.isViewActive = true;
        this.solutionService.getSolution().then((solution) => this.solution = solution);

        this.venueService.getVenues().then(venues => {
            this.venuesLength = venues.length;
        });

        this.subscriptions
            // Venue observable
            .add(this.venueService.getVenueObservable()
                .subscribe((venue: Venue): void => {
                    this.venue = venue;
                    this.searchParameters.near = `venue:${this.venue.id}`;
                })
            );

        this.useBrowserPositioning = this.appConfig.appSettings.positioningDisabled !== '1';
        this.mapsIndoorsService.setPageTitle(this.translateService.instant('Direction.Directions'));

        const originPromise = this.populateOrigin();
        const destinationPromise = this.populateDestination();
        Promise.all([originPromise, destinationPromise])
            .then((): void => {
                this.getRoute();
            })
            .catch((): void => {
                this.loading = false;
            });
        window['angularComponentRef'] = { component: this, zone: this._ngZone };
        this.mapsIndoorsService.isMapDirty = true; // Show clear map button
    }
    // #region || ROUTE

    /**
     * Update search results list.
     *
     * @param {SearchData} { query, results }
     */
    public searchResultsChange({ query, results }: SearchData): void {
        this.searchResults = [];
        this.clearRoute();

        if (results.length > 0) { // Results
            this.searchResults = results;
            this.isPoweredByGoogle = this.anyGoogleResults(results);
            this.currentPositionVisible = false;
        } else if (query.length > 0) { // No Results
            this.error = `${this.translateService.instant('DirectionHint.NoMatchingResults')} "${query}"`;
        } else { // Input cleared
            if (this.currentInputField === 'start') {
                this.currentPositionVisible = true;
                this.originLocation = null;
            } else this.destinationLocation = null;
            if (!this.mapsIndoorsService.floorSelectorIsVisible) {
                this.mapsIndoorsService.showFloorSelector();
            }
        }
    }
    /**
     * Remove errors and set loading to true.
     */
    public loadingHandler(): void {
        this.error = null;
        this.currentPositionVisible = false;
        this.loading = true;
    }

    /**
     * Register the actively used search input field.
     * @param fieldName {string} 'start' or 'dest' field name
     */
    public setCurrentInputField(fieldName): void {
        this.searchInputFieldHasFocus = true;
        this.currentInputField = fieldName;
    }

    /**
     * Register that no search input field has focus.
     */
    public blurInputField(): void {
        this.searchInputFieldHasFocus = false;
    }

    private anyGoogleResults(results): boolean {
        return results.some(result => result.properties.type === 'google_places');
    }

    /**
     * @description Returns a Promise that always resolves because origin isn't required.
     * @returns {Promise}
     */
    private populateOrigin(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.originLocation) resolve();
            else if (this.route.snapshot.params.from) {
                this.locationService.getLocationById(this.route.snapshot.params.from)
                    .then((location: Location): void => {
                        this.originLocation = location;
                        this.originInputValue = location.properties.name;
                        resolve();
                    })
                    .catch((err: Error): void => {
                        this.notificationService.displayNotification(err.message);
                        reject();
                    });
            } else if (this.useBrowserPositioning) {
                this.originInputValue = this.translateService.instant('Direction.MyPosition');
                this.currentPositionVisible = false;
                this.userAgentService.getCurrentPosition()
                    .then((position: GeolocationPosition): void => {
                        if (this.originInputValue !== this.translateService.instant('Direction.MyPosition')) {
                            return; // Only populate if input hasn't changed.
                        }

                        // Search nearby users location.
                        this.searchParameters.near = { lat: position.coords.latitude, lng: position.coords.longitude };

                        this.originLocation = {
                            geometry: position,
                            properties: {
                                name: this.translateService.instant('Direction.MyPosition'),
                                floor: '0'
                            }
                        };

                        resolve();
                    }).catch((): void => {
                        this.originInputValue = '';
                        this.currentPositionVisible = true;
                        this.handleMyPositionError();
                        reject();
                    });
            } else reject();
        });
    }

    /**
     * Update properties on my position button click.
     *
     * @param {UserPosition} userPosition
     */
    handleMyPositionClick(userPosition: UserPosition): void {
        this.currentPositionVisible = false;
        this.originLocation = userPosition;
        this.originInputValue = userPosition.properties.name;
        this.originSearchComponent.query = userPosition.properties.name; // Workaround for setting "query"
        this.getRoute();
    }

    /**
     * @description Shows a no position error in the snackbar.
     * @memberof DirectionsComponent
     */
    handleMyPositionError(): void {
        this.notificationService.displayNotification(
            this.translateService.instant('Error.NoPosition')
        );
    }

    // #region - || DESTINATION
    /**
     * @description Returns a promise.
     * @returns {Promise}
     */
    private populateDestination(): Promise<void> {
        return new Promise((resolve, reject): void => {
            const locationId = this.route.snapshot.params.id ? this.route.snapshot.params.id : this.route.snapshot.params.to;
            if (locationId) {
                this.locationService.getLocationById(locationId)
                    .then((location: Location): void => {
                        this.destinationInputValue = this.getPrettyQuery(location);
                        this.destinationLocation = location;
                        resolve();
                    })
                    .catch((err: Error): void => {
                        this.notificationService.displayNotification(err.message);
                        reject();
                    });
            } else reject();
        });
    }
    // #endregion

    // #region - SWITCH ORIGIN AND DESTINATION
    switchOriginAndDest(): void {
        [this.originLocation, this.destinationLocation] = [this.destinationLocation, this.originLocation];
        [this.originInputValue, this.destinationInputValue] = [this.destinationInputValue, this.originInputValue];
        this.clearRoute();
        if (this.hasOriginAndDestination()) {
            this.getRoute();
        }
        this.trackerService.sendEvent('Directions page', 'Reverse route', 'Reverse route was clicked', true);
    }
    // #endregion

    // #region - TRAVEL MODE
    setNewTravelMode(travelMode): void {
        this.clearRoute();
        this.travelMode = travelMode;
        sessionStorage.setItem('TRAVEL_MODE', travelMode);
        if (this.hasOriginAndDestination()) {
            this.getRoute();
        }
        this.trackerService.sendEvent('Directions page', 'Travel mode switch', `${travelMode} was set as new travel mode`, true);
    }
    // #endregion

    // #region - AVOID STAIRS
    changeAvoidStairs(): void {
        this.avoidStairs = !this.avoidStairs;
        if (this.hasOriginAndDestination()) {
            this.getRoute();
        }
        this.trackerService.sendEvent('Directions page', 'Avoid stairs', `Avoid stairs was set to ${this.avoidStairs}`, true);
    }
    // #endregion


    // #region - AGENCY INFO
    toggleAgencyInfo(): void {
        this.showAgencyInfo = !this.showAgencyInfo;
    }
    // #endregion

    // Format selected location and set
    selectLocation(location): void {
        const self = this;
        this.searchResults = [];

        if (this.currentInputField === 'start') {
            this.isPoweredByGoogle = false;
            // Google location
            if (location.properties.type === 'google_places') {
                const query = `${location.properties.name}, ${location.properties.subtitle}`;
                this.originInputValue = query;
                this.originSearchComponent.query = query;
                // Getting coordinates for google place
                this.geoCodingService.geocode({ 'placeId': location.properties.placeId }, (results, status) => {
                    if (results.length > 0) {
                        location.geometry = {
                            type: 'point',
                            coordinates: [results[0].geometry.location.lng(), results[0].geometry.location.lat()]
                        };
                        self.originLocation = location;
                        self.getRoute();
                    } else {
                        console.log('Geocode was not successful for the following reason: ' + status); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
                    }
                });
            } else {
                // MapsIndoors location
                const query = this.getPrettyQuery(location);
                this.originInputValue = query;
                this.originSearchComponent.query = query;
                this.originLocation = location;
                this.getRoute();
            }
            this.trackerService.sendEvent('Directions page', 'Origin Search', `${self.originInputValue} was set as start position`, true);
        } else if (this.currentInputField === 'dest') {
            this.isPoweredByGoogle = false;
            // Google location
            if (location.properties.type === 'google_places') {
                const query = `${location.properties.name}, ${location.properties.subtitle}`;
                this.destinationInputValue = query;
                this.destinationSearchComponent.query = query;
                // Getting coordinates for google place
                this.geoCodingService.geocode({ 'placeId': location.properties.placeId }, (results, status) => {
                    if (results.length > 0) {
                        location.geometry = {
                            type: 'point',
                            coordinates: [results[0].geometry.location.lng(), results[0].geometry.location.lat()]
                        };
                        self.destinationLocation = location;
                        self.getRoute();
                    } else {
                        console.log('Geocode was not successful for the following reason: ' + status); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
                    }
                });
            } else {
                // MapsIndoors location
                const query = this.getPrettyQuery(location);
                this.destinationInputValue = query;
                this.destinationSearchComponent.query = query;
                this.destinationLocation = location;
                this.getRoute();
            }
            this.trackerService.sendEvent('Directions page', 'Destination Search', `${self.destinationInputValue} was set as destination`, true);
        }
    }

    // #endregion

    /**
     * Get location icon URL.
     *
     * @param {Location} location
     * @returns {string}
     */
    getIconUrl(location: Location): string {
        return this.locationService.getLocationIconUrl(location, this.solution.types);
    }

    /**
     * @description Builds a query based on the locations name, floorName, building, and venue parameter.
     * @private
     * TODO: Import Location type.
     * @param {*} location - The location to be formatted into a pretty string.
     * @returns A string to be used as value for input.
     * @memberof DirectionsComponent
     */
    private getPrettyQuery(location): string {
        let query: string = location.properties.name;
        query += location.properties.floorName ? ', Level ' + location.properties.floorName : '';
        query += location.properties.building && location.properties.building !== location.properties.venue ? ', ' + location.properties.building : '';
        query += location.properties.venue ? ', ' + location.properties.venue : '';
        return query;
    }

    // #region - || ROUTE REQUEST AND INTERACTIONS


    // #region - GET ROUTE DATA
    getRoute(): void {
        if (this.hasOriginAndDestination()) {
            this.searchResults = [];
            this._ngZone.run((): void => {
                this.loading = true;
            });

            this.isPoweredByGoogle = false;
            this.setUnitsPreference();

            const start = {
                lat: this.locationService.getAnchorCoordinates(this.originLocation).lat(),
                lng: this.locationService.getAnchorCoordinates(this.originLocation).lng(),
                floor: this.originLocation.properties.floor
            };

            const dest = {
                lat: this.locationService.getAnchorCoordinates(this.destinationLocation).lat(),
                lng: this.locationService.getAnchorCoordinates(this.destinationLocation).lng(),
                floor: this.destinationLocation.properties.floor
            };

            const args = {
                origin: start,
                destination: dest,
                travelMode: this.travelMode.toUpperCase(),
                avoidStairs: this.avoidStairs
            };

            this.directionService.getRoute(args)
                .then((directionsResponse): void => {
                    if (!this.hasOriginAndDestination()) {
                        return;
                    }

                    if (this.isViewActive) {
                        this.mapsIndoorsService.hideFloorSelector();

                        // Remove Fit Selection Control when getting directions
                        this.mapsIndoorsService.setFitSelectionInfo(null);

                        this._ngZone.run((): void => {
                            if (!this.hasOriginAndDestination()) {
                                return;
                            }

                            this.directionsRendererInstance.setRoute(directionsResponse);
                            this.directionsResponse = directionsResponse;
                            this.transitAgencies = this.getAgencyInfo(directionsResponse.legs);

                            // Skip overview and display first step
                            this.directionsRendererInstance.setStepIndex(0, 0);

                            // Flattened array of all steps in route
                            this.flattenedStepsArray = directionsResponse.legs.map((leg: Leg): Step[] => leg.steps).flat();

                            // Add Step Switcher Control element to map if the device is handset
                            if (this.isHandset) {
                                this.addStepSwitcherMapControl(this.flattenedStepsArray);
                            }

                            this.totalTravelDuration = directionsResponse.legs.reduce((sum, leg): number => {
                                return sum + leg.duration.value;
                            }, 0);

                            this.totalTravelDistance = directionsResponse.legs.reduce((sum, leg): number => {
                                return sum + leg.distance.value;
                            }, 0);

                            this.loading = false;

                            const myPositionTranslation: string = this.translateService.instant('Direction.MyPosition');
                            const externalLocation = this.originInputValue === myPositionTranslation || this.destinationInputValue === myPositionTranslation ? '"User location"' : 'external location';
                            const origin = `${(<Location> this.originLocation).id ? `"${this.originLocation.properties.name}" – ${(<Location> this.originLocation).id}` : externalLocation}`;
                            const destination = `${(<Location> this.destinationLocation).id ? `"${this.destinationLocation.properties.name}" – ${(<Location> this.destinationLocation).id}` : externalLocation}`;
                            this.trackerService.sendEvent('Directions', 'Got directions', `From ${origin} to ${destination}`);
                        });
                    }
                })
                .catch((err): void => {
                    console.log(err); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
                    this.loading = false;
                    this.error = this.translateService.instant('DirectionHint.NoRoute');
                });
        } else {
            this.error = this.translateService.instant('DirectionHint.FromAndTo');
        }
    }

    /**
     * Add step switcher control element to map.
     *
     * @private
     * @param {Step[]} steps
     * @returns {void}
     */
    private addStepSwitcherMapControl(steps: Step[]): void {
        if (steps && steps.length < 2 || this.stepSwitcherMapControl) {
            return;
        }

        this.stepSwitcherMapControl = new StepSwitcherControl(this.googleMapService.map, this.translateService.instant('Direction.Steps'));
        this.stepSwitcherMapControl.add(google.maps.ControlPosition.BOTTOM_CENTER, steps);
        this.stepSwitcherMapControl.miStepSwitcherElement.stepIndex = this.flattenedStepsArrayIndex;

        // Listen for stepIndexChanged event from <mi-step-switcher> component and set the leg index accordingly.
        this.handleStepIndexChanged = (event: CustomEvent): void => {
            if (event.detail < this.flattenedStepsArrayIndex) {
                this.showPreviousStep();
            } else if (event.detail > this.flattenedStepsArrayIndex) {
                this.showNextStep();
            }
        };

        document.addEventListener('stepIndexChanged', this.handleStepIndexChanged);
    }

    /**
     * Remove stepIndexChanged event listener and step switcher control element from map.
     *
     * @private
     */
    private removeStepSwitcherMapControl(): void {
        if (this.stepSwitcherMapControl) {
            document.removeEventListener('stepIndexChanged', this.handleStepIndexChanged);
            this.stepSwitcherMapControl.remove();
            this.stepSwitcherMapControl = null;
        }
    }

    /**
     * Checks if origin and destination are set.
     * @returns boolean true if origin and destination are set.
     */
    hasOriginAndDestination(): boolean {
        return this.originLocation && this.destinationLocation ? true : false;
    }

    /**
     * Set unit to imperial or metric based on browser language.
     */
    setUnitsPreference(): void {
        this.unit = navigator.language === 'en-US' ? UnitSystem.Imperial : UnitSystem.Metric;
    }

    /**
     * Extract transit agency information from directions response legs.
     * @param {array} legs
     * @returns {array}
     */
    getAgencyInfo(legs): object[] {
        let agenciesArray = [];
        for (const leg of legs) {
            for (const step of leg.steps) {
                if (step.transit_information) {
                    const agencies = step.transit_information.line.agencies.map((agency): object => {
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

        // Avoid duplicates (looking at agency name)
        agenciesArray = agenciesArray.filter((agency, position, originalArray): boolean => originalArray.map((mapAgency): string => mapAgency['name']).indexOf(agency['name']) === position);

        return agenciesArray;
    }

    // #region - INTERACTION WITH SEGMENTS
    /**
     * Show previous step.
     */
    showPreviousStep(): void {
        if (this.flattenedStepsArrayIndex === 0) {
            return;
        }
        this.flattenedStepsArrayIndex--;
        this.directionsRendererInstance.previousStep();
        this.updateHighlightedStep();
    }

    /**
     * Show next step.
     */
    showNextStep(): void {
        if ((this.flattenedStepsArrayIndex + 1) === this.flattenedStepsArray.length) {
            return;
        }
        this.flattenedStepsArrayIndex++;
        this.directionsRendererInstance.nextStep();
        this.updateHighlightedStep();
    }

    /**
     * Update activeStep attribute on <mi-route-instructions> component.
     */
    updateHighlightedStep(): void {
        this.routeInstructionsComponent.nativeElement.activeStep = {
            legIndex: this.directionsRendererInstance.getLegIndex(),
            stepIndex: this.directionsRendererInstance.getStepIndex()
        };
    }

    /**
     * Set current step and leg.
     *
     * @param {number} stepIndex
     * @param {number} legIndex
     */
    setActiveStep(stepIndex: number, legIndex: number): void {
        // Show step on map
        this.directionsRendererInstance.setStepIndex(stepIndex, legIndex);

        const currentStep = this.directionsResponse.legs[legIndex].steps[stepIndex];
        this.flattenedStepsArrayIndex = this.flattenedStepsArray.indexOf(currentStep);

        // Update stepIndex at <mi-step-switcher> component
        if (this.stepSwitcherMapControl) {
            this.stepSwitcherMapControl.miStepSwitcherElement.stepIndex = this.flattenedStepsArrayIndex;
        }
    }
    // #endregion

    /**
     * @description Closing the sidebar
     */
    showOnMap(): void {
        this.sidenav.close();
        this.trackerService.sendEvent('Directions page', 'Show on map button', 'Show on map button was clicked', true);
    }

    // #endregion

    // #region - CLEAR ROUTE
    clearRoute(): void {
        this.directionsRendererInstance.setRoute(null);
        this.directionsResponse = null;
        this.removeStepSwitcherMapControl();

        // Update Fit Selection Info
        const locationId = this.route.snapshot.params.id || this.route.snapshot.params.to;
        this.locationService.getLocationById(locationId).then((location) => {
            const locationAnchorPoint = this.locationService.getAnchorCoordinates(location);
            const currentSelectionInfo: FitSelectionInfo = {
                name: location.properties.name,
                coordinates: locationAnchorPoint,
                isVenue: false
            };
            this.mapsIndoorsService.setFitSelectionInfo(currentSelectionInfo);
        });

        this.transitAgencies = [];
        this.flattenedStepsArrayIndex = 0;
        this.flattenedStepsArray = [];
        this.loading = false;
        this.isPoweredByGoogle = false;
        this.error = null;
    }
    // #endregion

    // #endregion

    // #region || DESTROY
    goBack(): void {
        const solutionName = this.solutionService.getSolutionName();
        const id = this.route.snapshot.params.id;
        this.router.navigate([`${solutionName}/${this.venue.id}/details/${id}`]);
    }

    ngOnDestroy(): void {
        this.isViewActive = false;
        window['angularComponentRef'] = null;
        this.clearRoute();
        this.mapsIndoorsService.showFloorSelector();
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
        if (this.originSearchSubscription) { this.originSearchSubscription.unsubscribe(); }
        if (this.destinationSearchSubscription) { this.destinationSearchSubscription.unsubscribe(); }
        this.subscriptions.unsubscribe();
    }
    // #endregion

}
