import { Component, OnInit, OnDestroy } from '@angular/core';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { GoogleMapService } from '../services/google-map.service';
import { Router } from '@angular/router';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { ThemeService } from '../services/theme.service';
import { Subscription } from 'rxjs';

declare const ga: Function;

@Component({
	selector: 'venue-list',
	templateUrl: './venues.component.html',
	styleUrls: ['./venues.component.scss']
})
export class VenuesComponent implements OnInit, OnDestroy {
	statusOk: boolean = false;
	appInfo: any; // Used for localstorage
	colors: object;
	venues: any[] = [];
	appConfig: any;
	solutionId: number;
	themeServiceSubscription: Subscription;
	appConfigSubscription: Subscription;

	constructor(
		private router: Router,
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private themeService: ThemeService,
		private venueService: VenueService,
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
	) {
		this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
		this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
	}

	ngOnInit() {
		this.getPreviousVenue();
		this.statusOk = true;
	}

	// #region || GET PREVIOUS VENUE
	async getPreviousVenue() {
		// If any venueId in localStorage from previous visit then load it directly
		this.solutionId = await this.solutionService.getSolutionId();
		this.solutionId = this.solutionId ? this.solutionId : null;

		this.appInfo = JSON.parse(localStorage.getItem('MI:' + this.solutionId)) || {};
		if (this.appInfo.lastVenue) {
			const venue = await this.venueService.getVenueById(this.appInfo.lastVenue);
			this.setVenue(venue);
		}
		// Else get all venues
		else {
			this.mapsIndoorsService.setPageTitle();
			this.getVenues();
		}
	}
	// #endregion

	// #region || GET ALL VENUES
	async getVenues() {
		const venues = await this.venueService.getVenues();
		// Set Venue and navigate to search page if solution only have one venue
		if (venues && venues.length === 1) {
			venues[0].onlyVenue = true;
			this.setVenue(venues[0]);
		}
		else if (this.venueService.fitVenues) {
			this.fitVenuesInView(venues);
		}
		this.venues = venues;
	}

	async fitVenuesInView(venues) {
		// If the solution have multiple venues fit them all inside bbox
		let bounds = new google.maps.LatLngBounds();
		if (this.appConfig.appSettings && !this.appConfig.appSettings.defaultVenue) {
			if (venues && venues.length !== 0) {
				for (const venue of venues) {
					for (const coordinates of venue.geometry.coordinates) {
						for (const coordinate of coordinates) {
							bounds.extend({ lat: coordinate[1], lng: coordinate[0] });
						}
					}
				}
			}
		}
		// Zoom in to default venue if any
		else if (this.appConfig.appSettings && this.appConfig.appSettings.defaultVenue && this.appConfig.appSettings.defaultVenue.length === 24) {
			const venueId = await this.appConfig.appSettings.defaultVenue;
			const venue = await this.venueService.getVenueById(venueId);
			if (venue) {
				const bbox = venue.geometry.bbox;
				bounds = new google.maps.LatLngBounds({ lat: bbox[1], lng: bbox[0] }, { lat: bbox[3], lng: bbox[2] });
			}
			else {
				console.log('Default venue ID is not correct');
			}
		}
		this.googleMapService.googleMap.fitBounds(bounds);
	}
	// #endregion

	// #region || SET VENUE
	// Set venue and go to search-page
	async setVenue(venue) {
		this.venueService.setVenue(venue, this.appConfig);

		// Save venueId in local storage and load venue directly next time
		this.appInfo.lastVenue = venue.id;
		localStorage.setItem('MI:' + this.solutionId, JSON.stringify(this.appInfo));

		this.mapsIndoorsService.setPageTitle();

		this.mapsIndoorsService.showFloorSelector();
		const solutionName = await this.solutionService.getSolutionName();
		this.router.navigate([`${solutionName}/${venue.id}/search`]);
		// Google Analytics
		ga('send', 'event', 'Venues page', 'Venue selected', `${venue.venueInfo.name} was selected`);
	}
	// #endregion

	ngOnDestroy() {
		this.appConfigSubscription.unsubscribe();
		this.themeServiceSubscription.unsubscribe();
	}
}
