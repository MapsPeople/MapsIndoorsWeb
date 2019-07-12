import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { Subject, Observable } from 'rxjs';

declare const mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class VenueService {

	miVenueService = mapsindoors.VenuesService;
	appConfig: any;
	venue: any;
	venuesLength: number;
	favouredVenue: boolean;
	fitVenues: boolean = true;
	returnBtnActive: boolean = true;

	private venueObservable = new Subject<any>();

	constructor(
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
	}

	// #region || GET ALL VENUES
	async getVenues() {
		const venuesRequest = this.miVenueService.getVenues();
		const venues = await venuesRequest;

		for (const venue of venues) {
			const center = await [].concat(venue.anchor.coordinates).reverse();
			venue.anchor.center = center;
			venue.image = this.appConfig.venueImages[venue.name.toLowerCase()];
			// TODO: Make a fallback image if no venueImage
			// venue.image = config.venueImages[venue.name.toLowerCase()] || ['https://maps.googleapis.com/maps/api/staticmap?center=', center, '&size=400x220&zoom=14&style=feature:all|saturation:-80&style=feature:poi|visibility:off&key=AIzaSyCrk6QMTzO0LhPDfv36Ko5RCXWPER_5o8o'].join("");
		}
		return venues;
	}
	// #endregion

	getVenueObservable(): Observable<any> {
		return this.venueObservable.asObservable();
	}

	// #region || COUNT VENUES
	async getVenuesLength() {
		const self = this;
		let length;
		if (this.venuesLength) {
			length = this.venuesLength;
		}
		else {
			await this.getVenues().then((venues) => {
				self.venuesLength = venues.length;
				length = venues.length;
			});
		}
		return length;
	}
	// #endregion

	// #region || GET VENUE BY ID
	async getVenueById(venueId) {
		const venueRequest = this.miVenueService.getVenue(venueId);
		const venue = await venueRequest;
		return venue;
	}
	// #endregion

	// #region || SET VENUE
	setVenue(venue, appConfig) {
		return new Promise(async (resolve, reject) => {

			const center = await [].concat(venue.anchor.coordinates).reverse();
			venue.anchor.center = center;
			// venue.image = appConfig.venueImages[venue.name.toLowerCase()] || ['https://maps.googleapis.com/maps/api/staticmap?center=', center, '&size=400x220&zoom=14&style=feature:all|saturation:-80&style=feature:poi|visibility:off&key=AIzaSyCrk6QMTzO0LhPDfv36Ko5RCXWPER_5o8o'].join("");

			for (const venueName in appConfig.venueImages) {
				if (venue.name.toLowerCase() === venueName) {
					venue.image = appConfig.venueImages[venue.name.toLowerCase()];
				}
			}
			// Used for return to "something" button
			this.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);
			this.returnBtnActive = true;
			this.favouredVenue = true;
			this.mapsIndoorsService.mapsIndoors.setVenue(venue);
			this.mapsIndoorsService.mapsIndoors.fitVenue(venue.id);

			this.venue = venue;
			this.venueObservable.next(venue);
			resolve(venue);
		});
	}
	// #endregion

	// #region || GET BUILDING BY ID
	async getBuildingById(buildingId) {
		const buildingRequest = this.miVenueService.getBuilding(buildingId);
		const building = await buildingRequest;
		return building;
	}
	// #endregion


}

