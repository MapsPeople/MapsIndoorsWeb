import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
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

declare const ga: Function;

@Component({
	selector: 'app-details',
	templateUrl: './details.component.html',
	styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit, OnDestroy {
	ie11: boolean = false;
	isHandset: any;
	statusOk: boolean = false;
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
	breakpointObserverSubscription: Subscription;
	themeServiceSubscription: Subscription;

	constructor(
		private breakpointObserver: BreakpointObserver,
		private route: ActivatedRoute,
		private router: Router,
		public _ngZone: NgZone,
		private sidenav: MatSidenav,
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
			if (location) this.mapsIndoorsService.setPageTitle(location.properties.name);
		});

		this.breakpointObserverSubscription = this.breakpointObserver
			.observe(['(min-width: 600px)'])
			.subscribe((state: BreakpointState) => {
				if (state.matches) { this.isHandset = false; }
				else { this.isHandset = true; }
			});
	}

	async ngOnInit() {
		this.ie11 = (navigator.userAgent.match(/Trident/g) || navigator.userAgent.match(/MSIE/g)) ? true : false;
		await this.setVenue();
		await this.setLocation();
		this.displayAliases = this.appConfig.appSettings.displayAliases || false;
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
		this.statusOk = true;
	}

	// #region || SET VENUE
	async setVenue() {
		const self = this;
		const venueIdFromURL = this.route.snapshot.params.venueId;
		const venueRequest = this.venueService.venue ? this.venueService.venue : {};
		const urlVenueId = await venueIdFromURL;
		const venue = await venueRequest;

		// If the user comes from a previous page
		if (venue && venue.id === urlVenueId) this.venue = venue;
		// If direct url
		else {
			const venue = await self.venueService.getVenueById(urlVenueId);
			await this.venueService.setVenue(venue, self.appConfig).then((result) => {
				self.venue = result;
			});
		}
		this.mapsIndoorsService.floorSelector(true);
	}
	// #endregion

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
				for(const location of locations) {
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
		this.locationService.clearLocation();
		window["angularComponentRef"] = null;
		this.googleMapService.infoWindow.close();
		if (this.locationService.polygon) this.locationService.polygon.setMap(null);
		if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
		this.locationSubscription.unsubscribe();
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
		this.breakpointObserverSubscription.unsubscribe();
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
