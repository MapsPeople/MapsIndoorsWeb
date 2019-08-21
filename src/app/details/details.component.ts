import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
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

import { Venue } from '../shared/models/venue.interface';

declare const ga: Function;

@Component({
	selector: 'app-details',
	templateUrl: './details.component.html',
	styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit, OnDestroy {
	isInternetExplorer: boolean;
	isHandset: boolean;
	colors: object;
	venue: any;
	location: any;
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
		private shareUrlDialog: MatDialog,
	) {
		this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
		this.locationSubscription = this.locationService.getCurrentLocation().subscribe((location) => {
			this.location = location;
			this.mapsIndoorsService.setPageTitle(location.properties.name);
		});

		this.isHandsetSubscription = this.userAgentService.isHandset()
			.subscribe((value: boolean) => this.isHandset = value);
	}

	ngOnInit() {
		this.venueSubscription = this.venueService.getVenueObservable().subscribe((venue: Venue) => {
			if (venue && venue.id) {
				this.venue = venue;
				this.setLocation();
			}
		});
		this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
		this.displayAliases = this.appConfig.appSettings.displayAliases || false;
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
	}

	// #region || LOCATION
	async setLocation() {
		// 	TODO: LOCATION IS ALREADY SET FROM SEARCH > setLocation();
		const locationId = await this.route.snapshot.params.id;
		// For MI POI-id
		if (locationId.length === 24) {
			const location = await this.locationService.getLocationById(locationId);
			await this.locationService.setLocation(location);
		}
		// For room-id's
		else {
			await this.locationService.getLocations({ roomId: locationId }).then(async (locations: any[]) => {
				const locationArray = [];
				// Add locations to array if they match venue and id
				for (const location of locations) {
					if (location.properties.roomId === locationId && location.properties.venue === this.venue.venueInfo.name) {
						locationArray.push(location);
					}
				}
				// Set location if any else redirect to search
				locationArray.length !== 0 ? await this.locationService.setLocation(locationArray[0]) : this.goBack();

			}).catch((error) => {
				this.goBack();
			});
		}
	}

	/**
	 * @description Closing the sidebar
	 */
	showOnMap() {
		this.sidenav.close();
		// Google Analytics
		ga('send', 'event', 'Details page', 'Show on map button', 'Show on map button was clicked');
	}

	async getDirections(id) {
		const solutionName = await this.solutionService.getSolutionName();
		const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		this.router.navigate([`${solutionName}/${venueId}/route/destination/${id}`]);
	}
	// #endregion

	// #region || DESTROY
	async goBack() {
		const solutionName = await this.solutionService.getSolutionName();
		const venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		this.router.navigate([`${solutionName}/${venueId}/search`]);
		this.mapsIndoorsService.isMapDirty = false;
		this.mapsIndoorsService.setPageTitle();
	}

	ngOnDestroy() {
		this.mapsIndoorsService.mapsIndoors.location = null;
		window["angularComponentRef"] = null;
		this.googleMapService.infoWindow.close();
		if (this.locationService.polygon) this.locationService.polygon.setMap(null);
		if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
		this.locationSubscription.unsubscribe();
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
		this.venueSubscription.unsubscribe();
		this.isHandsetSubscription.unsubscribe();
		this.locationService.clearLocation();
	}
	// #endregion

	// #region || DIALOG || SHARE DIALOG
	openShareUrlDialog() {
		this.dialogRef = this.shareUrlDialog.open(ShareUrlDialogComponent, {
			width: '500px',
			autoFocus: true,
			disableClose: false,
			data: {
				url: window.location.href,
				locationName: this.location.properties.name
			}
		});

		this.dialogSubscription = this.dialogRef.afterClosed().subscribe(() => {
			const btn = document.getElementById('shareDialogOpenButton');
			btn.classList.remove('cdk-program-focused');
			btn.classList.add('cdk-mouse-focused');
		});

		// Google Analytics
		ga('send', 'event', 'Details page', 'Share POI dialog', 'Opened share url dialog');
	}
	// #endregion
}
