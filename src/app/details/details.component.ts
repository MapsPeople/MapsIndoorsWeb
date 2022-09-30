import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfigService } from '../services/app-config.service';
import { LocationService } from '../services/location.service';
import { MapsIndoorsService, FitSelectionInfo } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { VenueService } from '../services/venue.service';
import { ShareUrlDialogComponent } from './share-url-dialog/share-url-dialog.component';
import { ThemeService } from '../services/theme.service';
import { SolutionService } from '../services/solution.service';
import { UserAgentService } from '../services/user-agent.service';
import { NotificationService } from '../services/notification.service';
import { TrackerService } from '../services/tracker.service';
import { parse as parseDuration } from 'iso8601-duration';
import { add as addToDate, lightFormat } from 'date-fns';
import { Location, Venue } from '@mapsindoors/typescript-interfaces';
import { TimeInterval } from '../shared/models/timeInterval.interface';
import { LiveDataService } from '@mapsindoors/web-shared';

@Component({
    selector: 'app-details',
    templateUrl: './details.component.html',
    styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit, OnDestroy {
    isHandset: boolean;
    colors: {};
    venue: Venue;
    location: Location;
    displayAliases = false;
    locationPeakTime: TimeInterval;
    public timestamp: string;

    loading = false;
    appConfig: any;

    dialogRef: MatDialogRef<ShareUrlDialogComponent>;
    appConfigSubscription: Subscription;
    locationSubscription: Subscription;
    dialogSubscription: Subscription;
    isHandsetSubscription: Subscription;
    themeServiceSubscription: Subscription;
    venueSubscription: Subscription;

    private get locationLiveUpdateTimestamp(): string {
        return this.location?.liveUpdates?.get('position')?.timestamp;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public _ngZone: NgZone,
        private sidenav: MatSidenav,
        private userAgentService: UserAgentService,
        private themeService: ThemeService,
        private venueService: VenueService,
        private appConfigService: AppConfigService,
        private locationService: LocationService,
        private mapsIndoorsService: MapsIndoorsService,
        private solutionService: SolutionService,
        private googleMapService: GoogleMapService,
        private dialog: MatDialog,
        private notificationService: NotificationService,
        private trackerService: TrackerService,
        private liveDataService: LiveDataService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
        this.isHandsetSubscription = this.userAgentService.isHandset()
            .subscribe((value: boolean) => this.isHandset = value);
    }

    ngOnInit(): void {
        this.venueSubscription = this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
                this.venue = venue;
                if (!this.location) { // True when user comes from a direct link
                    this.setLocation();
                }
            });

        this.locationSubscription = this.locationService.getCurrentLocation()
            .subscribe((location: Location) => {
                if (!Array.isArray(location.properties.categories)) {
                    location.properties.categories = Object.values(location.properties.categories);
                }

                this.location = location;
                this.liveDataService?.liveDataManager?.removeListener('live_update_received', this.positionLiveUpdateReceived);

                if (this.liveDataService.liveDataManager && this.locationLiveUpdateTimestamp) {
                    this.timestamp = this.locationLiveUpdateTimestamp;
                    this.liveDataService.liveDataManager
                        .addListener('live_update_received', this.positionLiveUpdateReceived);
                }

                // If there's a timestamp, set it when changing Location otherwise set to undefined to remove Timestamp component from the view.
                this.timestamp = this.locationLiveUpdateTimestamp;

                this.googleMapService.openInfoWindow();
                this.mapsIndoorsService.setPageTitle(location.properties.name);
                this.setPeakTimeDetails(location);
            });

        this.displayAliases = this.appConfig.appSettings.displayAliases || false;
        window['angularComponentRef'] = { component: this, zone: this._ngZone };
    }

    /**
     * Callback when a `live_update_received` is received from the SDK.
     *
     * @param payload
     */
    private positionLiveUpdateReceived = (payload): void => {
        if (payload.domainType === 'position' && payload.id === this.location.id) {
            this.timestamp = payload.timestamp;
        }
    };

    // #region || LOCATION
    /**
     * @description Gets and sets the location based on the URL id parameter
     * @memberof DetailsComponent
     * @private
     */
    private setLocation(): void {
        const id = this.route.snapshot.params.id;
        // Location id
        if (id.length === 24) { // TODO: find a better way to determine whether it is a locationId or an externalId
            this.locationService.getLocationById(id)
                .then((location: Location) => this.locationService.setLocation(location))
                .catch((err: Error): void => {
                    this.notificationService.displayNotification(err.message);
                    this.goBack();
                });
        } else {
            // Room (external) id
            this.locationService.getLocationByExternalId(id)
                .then((location: Location) => this.locationService.setLocation(location))
                .catch((err: Error): void => {
                    this.notificationService.displayNotification(err.message);
                    this.goBack();
                });
        }
    }

    /**
     * Set location peak time details, if any.
     * @param location: Location
     */
    private setPeakTimeDetails(location: Location): void {
        const peakTimeFieldsKey = 'miPeakTime' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',][new Date().getDay()];
        if (location.properties.fields && location.properties.fields[peakTimeFieldsKey] && location.properties.fields[peakTimeFieldsKey].value) {
            const dateString = lightFormat(new Date(), 'yyyy-MM-dd');
            const peakTimeFullString = `${dateString}T${location.properties.fields[peakTimeFieldsKey].value}`;
            const startTime = new Date(peakTimeFullString.split('/')[0]);
            const duration = parseDuration(location.properties.fields[peakTimeFieldsKey].value);
            const endTime = addToDate(startTime, duration);
            this.locationPeakTime = { start: startTime, end: endTime };
        } else {
            this.locationPeakTime = undefined;
        }
    }

    /**
     * @description Closing the sidebar
     */
    public showOnMap(): void {
        this.sidenav.close();
        this.trackerService.sendEvent('Details page', 'Show on map button', 'Show on map button was clicked', true);
    }

    async getDirections(location: Location): Promise<void> {
        const solutionName = await this.solutionService.getSolutionName();
        const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
        this.router.navigate([`${solutionName}/${venueId}/route/destination/${location.id}`]);
        this.trackerService.sendEvent('Directions', 'Clicked "Get Directions"', `"${location.properties.name}" - ${location.id}`);
    }
    // #endregion

    // #region || DESTROY
    /**
     * @description Return to the previous page "Search-page".
     * @returns {void}
     * @memberof DetailsComponent
     */
    goBack(): void {
        this.mapsIndoorsService.isMapDirty = false;
        this.mapsIndoorsService.setPageTitle();

        const currentSelectionInfo: FitSelectionInfo = {
            name: this.venue.venueInfo.name,
            coordinates: new google.maps.LatLng(this.venue.anchor.coordinates[1], this.venue.anchor.coordinates[0]),
            isVenue: true
        };
        this.mapsIndoorsService.setFitSelectionInfo(currentSelectionInfo);

        if (!this.locationService.getCategoryFilter()) {
            this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
            return;
        }
        this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`], { queryParams: { cat: this.locationService.getCategoryFilter().categoryKey.toLowerCase() } });
    }

    ngOnDestroy(): void {
        this.mapsIndoorsService.mapsIndoors.location = null;
        this.mapsIndoorsService.clearMapFilter();
        window['angularComponentRef'] = null;
        this.googleMapService.closeInfoWindow();
        this.locationService.clearLocationPolygonHighlight();
        if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
        this.locationSubscription.unsubscribe();
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
        this.venueSubscription.unsubscribe();
        this.isHandsetSubscription.unsubscribe();
        this.liveDataService?.liveDataManager?.removeListener('live_update_received', this.positionLiveUpdateReceived);
    }
    // #endregion

    // #region || DIALOG || SHARE DIALOG
    /**
     * @description Open share URL dialog.
     * @memberof DetailsComponent
     */
    public openShareUrlDialog(): void {
        this.dialogRef = this.dialog.open(ShareUrlDialogComponent, {
            width: '500px',
            autoFocus: true,
            disableClose: false,
            data: {
                url: window.location.href,
                locationName: this.location.properties.name
            }
        });

        this.dialogSubscription = this.dialogRef.afterClosed()
            .subscribe((): void => {
                this.trackerService.sendEvent('Details page', 'Share POI dialog', 'Close dialog button was clicked for Share POI', true);
            });
        this.trackerService.sendEvent('Details page', 'Share POI dialog', 'Opened share url dialog', true);
    }
    // #endregion
}
