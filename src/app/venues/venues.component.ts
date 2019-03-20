import { Component, OnInit } from '@angular/core';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { GoogleMapService } from '../services/google-map.service';
import { Router } from '@angular/router';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { ThemeService } from '../services/theme.service';

@Component({
	selector: 'venue-list',
	templateUrl: './venues.component.html',
	styleUrls: ['./venues.component.scss']
})
export class VenuesComponent implements OnInit {
	statusOk: boolean = false;
	appInfo: any; // Used for localstorage
	colors: object;
	venues: any = [];
	appConfig: any;
	solutionId: number;

	constructor(
		private router: Router,
		private solutionService: SolutionService,
		private appConfigService: AppConfigService,
		private themeService: ThemeService,
		private venueService: VenueService,
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
	) { }

	async ngOnInit() {
		const ac = this.appConfigService.getConfig();
		const tc = this.themeService.getThemeColors();
		this.appConfig = await ac;
		this.colors = await tc;
		this.getPreviousVenue();
		this.mapsIndoorsService.setPageTitle();
		this.statusOk = true;
	}

	// #region || GET PREVIOUS VENUE
	async getPreviousVenue() {
		// If any venueId in localStorage from previous visit then load it directly
		this.solutionId = await this.solutionService.getSolutionId()
		this.solutionId = this.solutionId ? this.solutionId : null;

		this.appInfo = JSON.parse(localStorage.getItem('MI:' + this.solutionId)) || {};
		if (this.appInfo.lastVenue) {
			let venue = await this.venueService.getVenueById(this.appInfo.lastVenue);
			this.setVenue(venue)
		}
		// Else get all venues
		else {
			this.getVenues()
		}
	}
	// #endregion

	// #region || GET ALL VENUES
	async getVenues() {
		let venues = await this.venueService.getVenues()
		// Set Venue and navigate to search page if solution only have one venue
		if (venues && venues.length == 1) {
			venues[0].onlyVenue = true;
			this.setVenue(venues[0])
		}
		else if (this.venueService.fitVenues){
			this.fitVenuesInView(venues);
		}
		this.venues = venues;
	}

	async fitVenuesInView(venues) {
		// If the solution have multiple venues fit them all inside bbox
		let bounds = new google.maps.LatLngBounds();
		if (this.appConfig.appSettings && !this.appConfig.appSettings.defaultVenue) {
			if (venues && venues.length != 0) {
				for (let venue of venues) {
					for (let coordinates of venue.geometry.coordinates) {
						for (let coordinate of coordinates) {
							bounds.extend({ lat: coordinate[1], lng: coordinate[0] });
						}
					}
				}
			}
		}
		// Zoom in to default venue if any
		else if (this.appConfig.appSettings && this.appConfig.appSettings.defaultVenue && this.appConfig.appSettings.defaultVenue.length === 24) {
			let venueId = await this.appConfig.appSettings.defaultVenue;
			let venue = await this.venueService.getVenueById(venueId)
			if (venue) {
				let bbox = venue.geometry.bbox;
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

		this.mapsIndoorsService.floorSelector(true);
		let routerPath = venue.id + '/search';
		this.router.navigate([routerPath.toString()])
	}
	// #endregion
}
