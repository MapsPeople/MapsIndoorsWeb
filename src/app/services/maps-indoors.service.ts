import { Injectable } from '@angular/core';
import { GoogleMapService } from './google-map.service';
import { AppConfigService } from './app-config.service';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { SolutionService } from './solution.service';
import { UserAgentService } from './user-agent.service';
import { TrackerService } from './tracker.service';
import { Location } from '@mapsindoors/typescript-interfaces';
import { FitSelectionControl } from '../controls/fit-selection.control';
import { TranslateService } from '@ngx-translate/core';

declare const mapsindoors: any;

export interface FitSelectionInfo {
    name: string,
    coordinates: google.maps.LatLng,
    isVenue: boolean
}

@Injectable({
    providedIn: 'root'
})
export class MapsIndoorsService {
    mapsIndoors: any;
    appConfig: any;
    isMapDirty = false;

    public floorSelectorIsVisible = false;
    private floorSelectorPosition: google.maps.ControlPosition;
    private floorSelectorListener;

    private isHandsetSubscription: Subscription;
    private pageTitle = new BehaviorSubject<string>('');
    private liveDataManagerSubject = new BehaviorSubject('');

    private fitSelectionControlElement: FitSelectionControl;

    constructor(
        private solutionService: SolutionService,
        private googleMapService: GoogleMapService,
        private appConfigService: AppConfigService,
        private userAgentService: UserAgentService,
        private trackerService: TrackerService,
        private translateService: TranslateService,
    ) {
        this.appConfigService.getAppConfig()
            .subscribe((appConfig): void => this.appConfig = appConfig);
    }

    // #region || SET MAPS INDOORS
    initMapsIndoors(): Promise<void> {
        return new Promise((resolve) => {
            this.mapsIndoors = new mapsindoors.MapsIndoors({
                mapView: this.googleMapService.googleMapView,
                labelOptions: {
                    style: {
                        fontFamily: 'Open Sans, Helvetica, sans-serif',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#343941', // MIDT: $color-gray-100
                        strokeWeight: '0px',
                        shadowBlur: '0px',
                    }
                }
            });

            this.mapsIndoors.setDisplayRule(['MI_BUILDING', 'MI_VENUE'], { visible: false });
            this.setSelectedUserRolesFromLocalStorage();

            // Add position control to the map and setup listeners on the user agent service.
            if (this.appConfig.appSettings.positioningDisabled !== '1') {
                const positionControlElement = document.createElement('div');
                this.userAgentService.positionControl = new mapsindoors.PositionControl(positionControlElement, { mapsIndoors: this.mapsIndoors, positionOptions: { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 } });
                this.googleMapService.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(positionControlElement);

                this.userAgentService.positionControl.addListener('position_error', (error): void => {
                    this.userAgentService.positionError(error);
                });

                this.userAgentService.positionControl.addListener('position_received', (position) => {
                    this.userAgentService.positionReceived(position);
                });
            }

            resolve();
        });
    }

    /**
     * Get user roles from local storage and set them on the MapsIndoors object.
     * @private
     */
    private setSelectedUserRolesFromLocalStorage(): void {
        this.solutionService.getSolutionId().then(solutionId => {
            const savedUserRolesInLocalStorage = JSON.parse(this.userAgentService.localStorage
                .getItem(`MI:${solutionId}:APPUSERROLES`) || '[]');

            mapsindoors.services.SolutionsService.getUserRoles().then(userRoles => {
                const localStorageAndSdkUserRolesMatch = userRoles.filter(userRole => savedUserRolesInLocalStorage.includes(userRole.id));
                mapsindoors.MapsIndoors.setUserRoles(localStorageAndSdkUserRolesMatch);
            });
        });
    }

    // #endregion

    // #region || FLOOR SELECTOR
    showFloorSelectorAfterUserInteraction(): void {
        const mapElement = document.getElementById('gmap');
        const eventsToListenFor = ['touchmove', 'click', 'wheel']; // these are events we consider as user interactions with the map

        const userInteracted = (): void => {
            eventsToListenFor.forEach(event => mapElement.removeEventListener(event, userInteracted));

            if (!this.floorSelectorIsVisible) {
                this.showFloorSelector();
            }
        };

        eventsToListenFor.forEach(event => mapElement.addEventListener(event, userInteracted));
    }


    /**
     * @description Creates a new floor selector.
     * @memberof MapsIndoorsService
     */
    showFloorSelector(): void {
        const floorSelectorDiv = document.createElement('div');
        new mapsindoors.FloorSelector(floorSelectorDiv, this.mapsIndoors);

        this.isHandsetSubscription = this.userAgentService.isHandset()
            .subscribe((isHandset: boolean) => {
                if (this.floorSelectorIsVisible) {
                    this.googleMapService.map.controls[this.floorSelectorPosition].clear();
                }

                this.floorSelectorPosition = isHandset ?
                    google.maps.ControlPosition.LEFT_CENTER :
                    google.maps.ControlPosition.RIGHT_CENTER;

                this.googleMapService.map.controls[this.floorSelectorPosition].push(floorSelectorDiv);
                this.floorSelectorIsVisible = true;
            });

        this.floorSelectorListener = this.trackFloorChange.bind(this);
        this.mapsIndoors.addListener('floor_changed', this.floorSelectorListener);
    }

    /**
     * @description Register floor change events on tracker service.
     */
    trackFloorChange(): void {
        this.trackerService.sendEvent('Floor selector', 'Floor was changed', `${this.mapsIndoors.getFloor()}th floor was set`, true);
    }

    /**
     * @description Removes the floor selector.
     * @memberof MapsIndoorsService
     */
    hideFloorSelector(): void {
        if (!this.floorSelectorIsVisible) {
            return;
        }

        this.googleMapService.map.controls[this.floorSelectorPosition].clear();
        this.floorSelectorIsVisible = false;
        this.mapsIndoors.removeListener('floor_changed', this.floorSelectorListener);
        this.isHandsetSubscription.unsubscribe();
    }

    /**
     * @description Sets the floor.
     * @param {string} floor - The new floor to be set.
     * @memberof MapsIndoorsService
     */
    setFloor(floor: string): void {
        if (this.mapsIndoors.getFloor() !== floor) {
            this.mapsIndoors.setFloor(floor);
        }
    }
    // #endregion

    /**
     * Set selection info for Fit Selection Control or use null for disabling it.
     */
    public setFitSelectionInfo(selectionInfo: FitSelectionInfo): void {
        // Update info
        if (selectionInfo) {
            selectionInfo.name = `${this.translateService.instant('Buttons.ReturnTo')} ${selectionInfo.name}`;
        }

        this.fitSelectionControlElement?.updateInfo(selectionInfo);
    }

    /**
     * Initialize Fit Selection Control.
     *
     * @param {google.maps.LatLngBounds} venueBoundingBox
     */
    public initFitSelectionControl(venueBoundingBox: google.maps.LatLngBounds): void {
        this.fitSelectionControlElement = new FitSelectionControl(this.googleMapService.map, this.mapsIndoors, venueBoundingBox);
    }

    // #region || PAGE TITLE
    // Don't belong in here
    setPageTitle(title?: string): void {
        if (title) this.pageTitle.next(title);
        else if (this.appConfig.appSettings) this.pageTitle.next(this.appConfig.appSettings.title);
    }

    getCurrentPageTitle(): Observable<string> {
        return this.pageTitle.asObservable();
    }
    // #endregion

    /**
     * @description Only show locations passed along.
     * @param {Location[]} locations - Locations to show on map.
     * @param {boolean} [fitView=false] - Fit all visible locations into view.
     * @memberof MapsIndoorsService
     */
    public setMapFilter(locations: Location[], fitView = false): void {
        const locationIds = locations.map((location: Location): string => location.id);
        this.mapsIndoors.filter(locationIds, fitView);
    }

    /**
     * @description Fallback to original state with all locations shown.
     * @param {boolean} [fitView=false] - Fit all visible locations into view.
     * @memberof MapsIndoorsService
     */
    public clearMapFilter(fitView = false): void {
        this.mapsIndoors.filter(null, fitView);
    }
    /**
     * Notify all observers of liveDataManagerSubject when the live data manager is accessible.
     * @memberof MapsIndoorsService
     */
    public notifyLiveDataManagerObservers(): void {
        this.liveDataManagerSubject.next('available');
    }

    /**
     * Get the live data manager observable.
     */
    public getLiveDataManagerObservable(): Observable<string> {
        return this.liveDataManagerSubject.asObservable();
    }
}
