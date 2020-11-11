import { Component, OnInit, OnDestroy, NgZone, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSidenav } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../services/app-config.service';
import { UserAgentService } from '../../services/user-agent.service';
import { MapsIndoorsService } from '../../services/maps-indoors.service';
import { GoogleMapService } from '../../services/google-map.service';
import { LocationService } from '../../services/location.service';
import { VenueService } from '../../services/venue.service';
import { ThemeService } from '../../services/theme.service';
import { DirectionService } from '../../services/direction.service';
import { Subject, Subscription } from 'rxjs';
import { SolutionService } from '../../services/solution.service';
import { SearchComponent } from '../components/search/search.component';
import { NotificationService } from '../../services/notification.service';
import { TrackerService } from 'src/app/services/tracker.service';

import { Venue } from '../../shared/models/venue.interface';
import { Location } from '../../shared/models/location.interface';
import { BaseLocation } from '../../shared/models/baseLocation.interface';
import { SearchData } from '../components/search/searchData.interface';
import { SearchParameters } from '../../shared/models/searchParameters.interface';

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
    appConfig: any;
    venue: Venue;

    useBrowserPositioning: boolean;
    currentPositionVisible = true;
    currentPosition: any;

    travelMode: string = sessionStorage.getItem('TRAVEL_MODE') || 'WALKING';
    avoidStairs: boolean = false;

    currentInputField: string;

    geoCodingService = new google.maps.Geocoder()

    miDirectionsService = mapsindoors.DirectionsService;
    miGeoCodeService = mapsindoors.GeoCodeService;

    segmentHover: number; // Used for when hovering a segment

    searchParameters: SearchParameters = {
        take: 10,
        near: {},
        getGoogleResults: true,
        countryCodeRestrictions: ''
    };
    searchResults = [];
    isPoweredByGoogle = false;
    originLocation: BaseLocation;
    originInputValue: string;
    @ViewChild('originSearchComponent') originSearchComponent: SearchComponent;
    destinationLocation;
    destinationInputValue: string;
    @ViewChild('destinationSearchComponent') destinationSearchComponent: SearchComponent;

    debounceSearchOrigin: Subject<string> = new Subject<string>();
    debounceSearchDestination: Subject<string> = new Subject<string>();

    imperial: boolean;
    showAgencyInfo = false;
    agencies = [];
    totalTravelDuration: string = '';
    totalTravelDistance: string = '';

    startLegLabel: string = '';
    segmentExpanded: number;
    currentLegIndex: number = 0;

    subscriptions = new Subscription();

    isHandsetSubscription: Subscription;
    originSearchSubscription: Subscription;
    destinationSearchSubscription: Subscription;
    legIndexSubscription: Subscription;
    appConfigSubscription: Subscription;
    themeServiceSubscription: Subscription;

    userRolesPanel = false;
    userRolesList = [];
    selectedUserRoles = [];
    private solutionId: string;

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
        private directionService: DirectionService,
        private notificationService: NotificationService,
        private trackerService: TrackerService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);

        this.legIndexSubscription = this.directionService.getLegIndex()
            .subscribe((index: number) => this.currentLegIndex = index);

        this.isHandsetSubscription = this.userAgentService.isHandset()
            .subscribe((value: boolean) => this.isHandset = value);
    }

    async ngOnInit(): Promise<void> {
        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
        this.isViewActive = true;

        this.subscriptions
            // Venue observable
            .add(this.venueService.getVenueObservable()
                .subscribe((venue: Venue): void => {
                    this.venue = venue;
                    const near = `venue:${this.venue.id}`;
                    this.populateSearchParams(near);
                })
            );

        this.useBrowserPositioning = this.appConfig.appSettings.positioningDisabled !== '1';
        this.solutionService.getSolutionId()
            .then((id: string) => {
                this.solutionId = id;
                this.selectedUserRoles = JSON.parse(this.userAgentService.localStorage.getItem(`MI:${this.solutionId}:APPUSERROLES`) || '[]');
            })
            .catch(() => {
                this.notificationService.displayNotification(
                    this.translateService.instant('SetSolution.InitError')
                );
            });

        this.solutionService.getUserRoles()
            .then((roles) => this.userRolesList = roles)
            .catch(() => {
                this.notificationService.displayNotification(
                    this.translateService.instant('Error.General')
                );
            });
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

    searchResultsChange({ query, results }: SearchData) {
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

    loadingHandler() {
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

    private anyGoogleResults(results) {
        return results.some((result) => result.properties.type === 'google_places');
    }

    /**
     * @description Populates search parameters used for search.
     * @private
     * @param {(string | Object)} near - Coordinate or venue id.
     * @memberof DirectionsComponent
     */
    private populateSearchParams(near: string | Object): void {
        this.searchParameters.near = near;
        this.searchParameters.countryCodeRestrictions = this.appConfig.appSettings.countryCode ? this.appConfig.appSettings.countryCode : '';
    }

    /**
     * @description Returns a Promise that always resolves because origin isn't required.
     * @returns {Promise}
     */
    private populateOrigin(): Promise<void> {
        return new Promise(async (resolve, reject): Promise<void> => {
            if (this.originLocation) resolve();
            else if (this.route.snapshot.params.from) {
                await this.locationService.getLocationById(this.route.snapshot.params.from)
                    .then((location: Location): void => {
                        this.originLocation = location as BaseLocation;
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
                    .then((position: Position): void => {
                        if (this.originInputValue !== this.translateService.instant('Direction.MyPosition')) {
                            return; // Only populate if input hasn't changed.
                        }

                        this.currentPosition = position;
                        this.populateSearchParams({ lat: position.coords.latitude, lng: position.coords.longitude });

                        this.originLocation = {
                            id: undefined,
                            geometry: { coordinates: [position.coords.longitude, position.coords.latitude] },
                            properties: { name: this.translateService.instant('Direction.MyPosition'), floor: '0' }
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

    handleMyPositionClick(position) {
        this.currentPositionVisible = false;

        this.originLocation = {
            id: undefined,
            geometry: { coordinates: position.coordinates },
            properties: { name: position.name, floor: '0' }
        };

        this.originInputValue = position.name;
        this.originSearchComponent.query = position.name; // Workaround for setting "query"
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
                        this.directionService.destinationQuery = this.destinationInputValue; // Used for horizontal directions
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
    switchOriginAndDest() {
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
    setNewTravelMode(travelMode) {
        this.clearRoute();
        this.travelMode = travelMode;
        sessionStorage.setItem('TRAVEL_MODE', travelMode);
        if (this.hasOriginAndDestination()) {
            this.getRoute();
        }
        this.trackerService.sendEvent('Directions page', 'Travel mode switch', `${travelMode} was set as new travel mode`, true);
    }
    // #endregion

    // #region - TOGGLE SEGMENTS
    toggleSegment(legIndex) {
        if (legIndex === this.segmentExpanded) this.segmentExpanded = -1;
        else {
            this.segmentExpanded = legIndex;
            this.trackerService.sendEvent('Directions page', 'Directions legs', 'Steps was unfolded', true);
        }
    }
    // #endregion

    // #region - AVOID STAIRS
    changeAvoidStairs() {
        this.avoidStairs = !this.avoidStairs;
        if (this.hasOriginAndDestination()) {
            this.getRoute();
        }
        this.trackerService.sendEvent('Directions page', 'Avoid stairs', `Avoid stairs was set to ${this.avoidStairs}`, true);
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
        this.userAgentService.localStorage.setItem('MI:' + this.solutionId + ':APPUSERROLES', JSON.stringify(this.selectedUserRoles));
        this.getRoute();
    }
    // #endregion

    // #region - AGENCY INFO
    toggleAgencyInfo() {
        this.showAgencyInfo = !this.showAgencyInfo;
    }
    // #endregion

    // Format selected location and set
    selectLocation(location) {
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
                        self.originLocation = location as BaseLocation;
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
    getRoute() {
        if (this.hasOriginAndDestination()) {
            const self = this;
            this.searchResults = [];
            this._ngZone.run(() => {
                this.loading = true;
            });
            this.venueService.returnBtnActive = false;
            this.isPoweredByGoogle = false;
            this.setUnitsPreference();

            const start = (self.originLocation.properties && self.originLocation.properties.anchor) ?
                // For new poi objects
                { lat: self.originLocation.properties.anchor.coordinates[1], lng: self.originLocation.properties.anchor.coordinates[0], floor: self.originLocation.properties.floor } :
                // For old poi objects and user positions
                { lat: self.originLocation.geometry.coordinates[1], lng: self.originLocation.geometry.coordinates[0], floor: self.originLocation.properties.floor };

            const dest = self.destinationLocation.properties.anchor ?
                // For new poi objects
                { lat: self.destinationLocation.properties.anchor.coordinates[1], lng: self.destinationLocation.properties.anchor.coordinates[0], floor: self.destinationLocation.properties.floor } :
                // For old poi objects
                { lat: self.destinationLocation.geometry.coordinates[1], lng: self.destinationLocation.geometry.coordinates[0], floor: self.destinationLocation.properties.floor };
            const args = {
                origin: start,
                destination: dest,
                mode: self.travelMode.toUpperCase(),
                avoidStairs: self.avoidStairs,
                userRoles: null
            };

            if (this.selectedUserRoles.length > 0) {
                args.userRoles = this.selectedUserRoles;
            }

            this.request(args)
                .then((data) => {
                    if (!this.hasOriginAndDestination()) {
                        return;
                    }

                    if (this.isViewActive) {
                        this.mapsIndoorsService.hideFloorSelector();
                        this._ngZone.run(async () => {
                            this.agencies = this.getAgencyInfo(data);

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

                            if (this.hasOriginAndDestination()) {
                                this.directionService.drawPolylines(0);
                            }

                            const myPositionTranslation: string = this.translateService.instant('Direction.MyPosition');
                            const externalLocation = this.originInputValue === myPositionTranslation || this.destinationInputValue === myPositionTranslation ? '"User location"' : 'external location';
                            const origin = `${this.originLocation.id ? `"${this.originLocation.properties.name}" – ${this.originLocation.id}` : externalLocation}`;
                            const destination = `${this.destinationLocation.id ? `"${this.destinationLocation.properties.name}" – ${this.destinationLocation.id}` : externalLocation}`;
                            this.trackerService.sendEvent('Directions', 'Got directions', `From ${origin} to ${destination}`);

                            this.loading = false;
                        });
                    }
                })
                .catch((err) => {
                    console.log(err); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
                    this.loading = false;
                    this.error = this.translateService.instant('DirectionHint.NoRoute');
                });
        } else {
            this.error = this.translateService.instant('DirectionHint.FromAndTo');
        }
    }


    /**
     * Checks if origin and destination are set.
     * @returns boolean true if origin and destination are set.
     */
    hasOriginAndDestination(): boolean {
        return this.originLocation && this.destinationLocation;
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
                                step._mi = { type: 'google.maps.DirectionsLeg' };
                                legsExtended.push(step);
                            }
                        } else legsExtended.push(leg);
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
        this.imperial = await navigator.language === 'en-US' ? true : false;
        // const firstStepText = legsExtended[0].steps[0].distance.text;
        // this.imperial = await (firstStepText.includes(" ft") || firstStepText.includes(" mi")) ? true : false;
    }

    getAgencyInfo(legs) {
        let agenciesArray = [];
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

        // Avoid duplicates (looking at agency name)
        agenciesArray = agenciesArray.filter((agency, position, originalArray) => originalArray.map(mapAgency => mapAgency['name']).indexOf(agency['name']) === position);

        return agenciesArray;
    }

    setIndexForLegs(legsExtended) {
        let legIndex: number = 0;
        return new Promise((resolve) => {
            for (const leg of legsExtended) {
                leg.index = legIndex ? legIndex : 0;
                legIndex = ++legIndex;
            }
            resolve(legsExtended);
        });
    }

    getTotalDistance(legs) {
        let totalDistance: number = 0;
        return new Promise((resolve) => {
            for (const leg of legs) {
                // Counting up total travel distance
                totalDistance += leg.distance.value;
            }
            resolve(totalDistance);
        });
    }

    getTotalDuration(legs) {
        let totalDuration: number = 0;
        return new Promise((resolve) => {
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

        return new Promise(async (resolve) => {
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
                            leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Enter')}:</span>`;
                            entranceOrExits.push(leg.steps[0]);
                        } else if (prev && prev._mi.type === 'mapsindoors.DirectionsLeg' && leg._mi.type !== 'mapsindoors.DirectionsLeg') {
                            leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Exit')}:</span>`;
                            entranceOrExits.push(leg.steps[0]);
                        } else if (prev && isInside.test(prev.steps[prev.steps.length - 1].abutters) && leg && isOutside.test(leg.steps[0].abutters)) {
                            leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Exit')}:</span>`;
                            entranceOrExits.push(leg.steps[0]);
                        } else if (prev && isOutside.test(prev.steps[prev.steps.length - 1].abutters) && leg && isInside.test(leg.steps[0].abutters)) {
                            leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Enter')}:</span>`;
                            entranceOrExits.push(leg.steps[0]);
                        }

                        switch (leg.steps[0].highway) {
                            case 'steps':
                            case 'stairs':
                                leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Stairs')}: </span>Level ` + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
                                break;
                            case 'elevator':
                                leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Elevator')}: </span>Level ` + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
                                break;
                            case 'escalator':
                                leg.steps[0].instructions = `<span class="action">${this.translateService.instant('DirectionRoute.Escalator')}: </span>Level ` + leg.start_location.floor_name + ' to ' + leg.end_location.floor_name;
                                break;
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

    /**
     * Determines if current leg transit departure location is similar to previous leg transit arrival location.
     *
     * @param {array} legs - direction legs
     * @param {number} legIndex - current leg index to evaluate
     * @returns {boolean}
     */
    isTransitTransferAtSameLocation(legs, legIndex) {
        if (legIndex === 0) {
            return false; // No previous leg to look at.
        }

        const prevLeg = legs[legIndex - 1];
        const currLeg = legs[legIndex];

        if (!prevLeg.transit || !currLeg.transit) {
            return false; // This is about two transit legs only.
        }

        return prevLeg.transit.arrival_stop.name === currLeg.transit.departure_stop.name
            && prevLeg.transit.arrival_stop.location.lat === currLeg.transit.departure_stop.location.lat
            && prevLeg.transit.arrival_stop.location.lng === currLeg.transit.departure_stop.location.lng;
    }

    /**
     * Returns if a leg should include parking instructions.
     * @param {object} routeLeg - Directions result route leg.
     * @returns {boolean}
     */
    public isParkingLeg(routeLeg): boolean {
        return routeLeg.steps[routeLeg.steps.length-1].parking && ['DRIVING', 'BICYCLING'].includes(routeLeg.steps[routeLeg.steps.length-1].travel_mode);
    }

    /**
     * @description Add missing maneuver in step.
     * @private
     * @param {*} step
     */
    private addMissingManeuver(step): void {
        if (/head|walk/i.test(step.instructions) && step.maneuver === '') {
            step.maneuver = 'straight';
        }

        if (step.highway && (!step.instructions || step.instructions === '')) {
            switch (step.maneuver) {
                case 'straight':
                    step.instructions = this.translateService.instant('DirectionRoute.Straight');
                    break;
                case 'turn-left':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnLeft');
                    break;
                case 'turn-right':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnRight');
                    break;
                case 'turn-sharp-left':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnSharpLeft');
                    break;
                case 'turn-sharp-right':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnSharpRight');
                    break;
                case 'turn-slight-left':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnSlightLeft');
                    break;
                case 'turn-slight-right':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnSlightRight');
                    break;
                case 'uturn-left':
                case 'uturn-right':
                case 'uturn':
                    step.instructions = this.translateService.instant('DirectionRoute.TurnAround');
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
            } else {
                const miles = meters / 1609.344;
                return (miles <= 328 ? Math.round(miles * 10) / 10 : Math.round(miles)) + ' mi';
            }
        } else {
            if (meters < 100) {
                return Math.round(meters * 10) / 10 + ' m';
            } else {
                meters = meters / 1000;
                return (meters <= 100 ? Math.round(meters * 10) / 10 : Math.round(meters)) + ' km';
            }
        }
    }

    // Used for creating origin input value
    getStartLabel(): void {
        // If startPosition is a google place
        if (this.originLocation.properties.subtitle) {
            this.startLegLabel = `${this.originLocation.properties.name} (${this.originLocation.properties.subtitle})`;
        } else {
            // If startPosition is a MI poi or user position
            let startPosition = this.originLocation.properties.name;
            let address = this.originLocation.properties.floorName ? 'Level ' + this.originLocation.properties.floorName : '';
            address += this.originLocation.properties.building ? ', ' + this.originLocation.properties.building : '';
            address += this.originLocation.properties.venue ? ', ' + this.originLocation.properties.venue : '';
            address = address.indexOf(', ') === 0 ? address.substring(2) : address;
            address = address > '' ? ' (' + address + ')' : '';
            startPosition += address;
            this.startLegLabel = startPosition;
        }
    }
    // #endregion

    // #region - INTERACTION WITH SEGMENTS
    prevSegment() {
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
        this.trackerService.sendEvent('Directions page', 'Show on map button', 'Show on map button was clicked', true);
    }

    // #endregion

    // #region - CLEAR ROUTE
    clearRoute() {
        this.directionService.disposePolylines();
        this.directionService.directionsLegs = [];
        this.venueService.returnBtnActive = true;
        this.agencies = [];
        this.directionService.clearLegIndex();
        this.segmentExpanded = null;
        this.loading = false;
        this.isPoweredByGoogle = false;
        this.error = null;
    }
    // #endregion

    // #endregion

    // #region || DESTROY
    async goBack() {
        const solutionName = await this.solutionService.getSolutionName();
        const id = this.route.snapshot.params.id;
        this.router.navigate([`${solutionName}/${this.venue.id}/details/${id}`]);
    }

    ngOnDestroy() {
        this.isViewActive = false;
        window['angularComponentRef'] = null;
        this.clearRoute();
        this.mapsIndoorsService.showFloorSelector();
        this.legIndexSubscription.unsubscribe();
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
        if (this.originSearchSubscription) { this.originSearchSubscription.unsubscribe(); }
        if (this.destinationSearchSubscription) { this.destinationSearchSubscription.unsubscribe(); }
        this.subscriptions.unsubscribe();
    }
    // #endregion

}
