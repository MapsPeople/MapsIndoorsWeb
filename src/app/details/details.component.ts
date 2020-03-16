import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSidenav, MatDialog, MatDialogRef } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfigService } from '../services/app-config.service';
import { LocationService } from '../services/location.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { VenueService } from '../services/venue.service';
import { ShareUrlDialogComponent } from './share-url-dialog/share-url-dialog.component';
import { ThemeService } from '../services/theme.service';
import { SolutionService } from '../services/solution.service';
import { UserAgentService } from '../services/user-agent.service';
import { RoutingStateService } from '../services/routing-state.service';
import { NotificationService } from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { TrackerService } from '../services/tracker.service';
import { AppMode } from '../shared/enums';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';

@Component({
    selector: 'app-details',
    templateUrl: './details.component.html',
    styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit, OnDestroy {
    isInternetExplorer: boolean;
    isHandset: boolean;
    colors: {};
    venue: Venue;
    location: Location;
    displayAliases: boolean = false;

    loading: boolean = false;
    appConfig: any;

    dialogRef: MatDialogRef<ShareUrlDialogComponent>;
    appConfigSubscription: Subscription;
    locationSubscription: Subscription;
    dialogSubscription: Subscription;
    isHandsetSubscription: Subscription;
    themeServiceSubscription: Subscription;
    venueSubscription: Subscription;
    public isKioskMode: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public _ngZone: NgZone,
        private sidenav: MatSidenav,
        private routingStateService: RoutingStateService,
        private userAgentService: UserAgentService,
        private themeService: ThemeService,
        private venueService: VenueService,
        private appConfigService: AppConfigService,
        private locationService: LocationService,
        private mapsIndoorsService: MapsIndoorsService,
        private solutionService: SolutionService,
        private googleMapService: GoogleMapService,
        private dialog: MatDialog,
        private translateService: TranslateService,
        private notificationService: NotificationService,
        private trackerService: TrackerService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
        this.locationSubscription = this.locationService.getCurrentLocation()
            .subscribe((location: Location) => {
                this.location = location;
                this.googleMapService.openInfoWindow();
                this.mapsIndoorsService.setPageTitle(location.properties.name);
            });
        this.isHandsetSubscription = this.userAgentService.isHandset()
            .subscribe((value: boolean) => this.isHandset = value);
    }

    ngOnInit():void {
        this.venueSubscription = this.venueService.getVenueObservable()
            .subscribe((venue: Venue):void => {
                this.venue = venue;
                if (!this.location) { // True when user comes from a direct link
                    this.setLocation();
                }
            });

        this.appConfigService.getAppMode()
            .subscribe((mode): void => {
                this.isKioskMode = mode === AppMode.Kiosk ? true : false;
            });
        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
        this.displayAliases = this.appConfig.appSettings.displayAliases || false;
        window['angularComponentRef'] = { component: this, zone: this._ngZone };
    }

    // #region || LOCATION
    /**
	 * @description Gets and sets the location based on the URL id parameter
	 * @memberof DetailsComponent
	 */
    setLocation(): void {
        const id = this.route.snapshot.params.id;
        // Location id
        if (id.length === 24) {
            this.locationService.getLocationById(id)
                .then((location: Location): void => {
                    this.locationService.setLocation(location);
                })
                .catch((err: Error): void => {
                    this.notificationService.displayNotification(err.message);
                    this.goBack();
                });
        } else {
        // Room (external) id
            this.locationService.getLocationByExternalId(id)
                .then((location: Location) => {
                    this.locationService.setLocation(location);
                })
                .catch((err: Error): void => {
                    this.notificationService.displayNotification(err.message);
                    this.goBack();
                });
        }
    }

    /**
	 * @description Closing the sidebar
	 */
    showOnMap() {
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
        this.mapsIndoorsService.setVenueAsReturnToValue(this.venue);
        if (!this.locationService.getCategoryFilter()) {
            this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`]);
            return;
        }
        this.router.navigate([`${this.solutionService.getSolutionName()}/${this.venue.id}/search`], { queryParams: { cat: this.locationService.getCategoryFilter().categoryKey.toLowerCase() } });
    }

    ngOnDestroy() {
        this.mapsIndoorsService.mapsIndoors.location = null;
        this.mapsIndoorsService.clearMapFilter();
        window['angularComponentRef'] = null;
        this.googleMapService.closeInfoWindow();
        if (this.locationService.polygon) this.locationService.polygon.setMap(null);
        if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
        this.locationSubscription.unsubscribe();
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
        this.venueSubscription.unsubscribe();
        this.isHandsetSubscription.unsubscribe();
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
