import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { AppConfigService } from '../services/app-config.service'
import { LocationService } from '../services/location.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { GoogleMapService } from '../services/google-map.service';
import { VenueService } from '../services/venue.service';
import { ShareUrlDialogComponent } from './share-url-dialog/share-url-dialog.component'
import { ThemeService } from '../services/theme.service';
import { MatSidenav } from '@angular/material';
import { SolutionService } from '../services/solution.service';

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
	locationSubscription: Subscription;
	dialogSubscription: Subscription;
	breakpointObserverSubscription: Subscription;

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
		this.locationSubscription = this.locationService.getCurrentLocation().subscribe(location => {
			this.location = location;
			this.mapsIndoorsService.setPageTitle(location.properties.name)
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
		this.appConfig = await this.appConfigService.getConfig();
		await this.checkForVenue();
		await this.setLocation()
		this.displayAliases = this.appConfig.appSettings.displayAliases || false;
		this.colors = await this.themeService.getThemeColors();
		window["angularComponentRef"] = { component: this, zone: this._ngZone };
		this.statusOk = true;
	}

	// #region || SET VENUE
	async checkForVenue() {
		let self = this;
		let venueIdFromURL = this.route.snapshot.params.venueId;
		let venueRequest = this.venueService.venue ? this.venueService.venue : {};
		let urlVenueId = await venueIdFromURL;
		let venue = await venueRequest;

		// If the user comes from a previous page
		if (venue && venue.id === urlVenueId) {
			this.venue = venue;
		}
		// If direct url
		else {
			let venue = await self.venueService.getVenueById(urlVenueId)
			await this.venueService.setVenue(venue, self.appConfig).then(result => {
				self.venue = result;
			});
		}
		this.mapsIndoorsService.floorSelector(true)
	}
	// #endregion

	// #region || LOCATION
	async setLocation() {
		let locationId = await this.route.snapshot.params.id
		// For MI POI-id
		if (locationId.length === 24) {
			const location = await this.locationService.getLocationById(locationId)
			await this.locationService.setLocation(location);
		}
		// For room-id's
		else {
			await this.locationService.getLocations({ roomId: locationId }).then(async locations => {
				let locationArray = [];
				// Add locations to array if they match venue and id
				for (let location of locations) {
					if (location.properties.roomId == locationId && location.properties.venue == this.venue.venueInfo.name) {
						locationArray.push(location)
					}
				}
				// Set location if any else redirect to search
				locationArray.length != 0 ? await this.locationService.setLocation(locationArray[0]) : this.goBack();

			}).catch(async error => {
				this.goBack();
			})
		}
	}

	async getDirections(id) {
		let venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		let routerPath = venueId + '/route/destination/' + id;
		this.router.navigate([routerPath.toString()])
	}

	// #endregion

	// #region || DESTROY
	async goBack() {
		let venueId = this.venue.id ? this.venue.id : this.route.snapshot.params.venueId;
		let routerPath = venueId + '/search';
		this.router.navigate([routerPath.toString()]);
		this.mapsIndoorsService.isMapDirty = false;
		this.locationService.clearLocation();
	}

	ngOnDestroy() {
		this.mapsIndoorsService.mapsIndoors.location = null;
		window["angularComponentRef"] = null;
		this.googleMapService.infoWindow.close();
		if (this.dialogSubscription) {
			this.dialogSubscription.unsubscribe();
		}
		this.locationSubscription.unsubscribe();
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
			let btn = document.getElementById('shareDialogOpenButton');
			btn.classList.remove('cdk-program-focused');
			btn.classList.add('cdk-mouse-focused');
		})
	}
	// #endregion
}
