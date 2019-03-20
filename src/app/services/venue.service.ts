import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service'
import { MapsIndoorsService } from '../services/maps-indoors.service';

declare var mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class VenueService {

	miVenueService = mapsindoors.VenuesService;
	venue: any;
	venuesLength: number;
	favouredVenue: boolean;
	fitVenues: boolean = true;
	returnBtnActive: boolean = true;

	constructor(
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
	) { }

	// #region || GET ALL VENUES
	async getVenues() {
		let venuesRequest = this.miVenueService.getVenues();
		let configRequest = this.appConfigService.getConfig();

		let venues = await venuesRequest;
		let config = await configRequest;

		for (let venue of venues) {
			let center = await [].concat(venue.anchor.coordinates).reverse();
			venue.anchor.center = center;
			venue.image = config.venueImages[venue.name.toLowerCase()];
		}
		return venues;
	}
	// #endregion

	// #region || COUNT VENUES
	async getVenuesLength() {
		let self = this;
		let length;
		if (this.venuesLength) {
			length = this.venuesLength;
		}
		else {
			await this.getVenues().then(venues => {
				self.venuesLength = venues.length;
				length = venues.length;
			})
		}
		return length;
	}
	// #endregion

	// #region || GET VENUE BY ID
	async getVenueById(venueId) {
		let venueRequest = this.miVenueService.getVenue(venueId);
		let venue = await venueRequest;
		return venue
	}
	// #endregion

	// #region || SET VENUE
	async setVenue(venue, appConfig) {
		return new Promise(async (resolve, reject) => {

			let center = await [].concat(venue.anchor.coordinates).reverse();
			venue.anchor.center = center;
			// venue.image = appConfig.venueImages[venue.name.toLowerCase()] || ['https://maps.googleapis.com/maps/api/staticmap?center=', center, '&size=400x220&zoom=14&style=feature:all|saturation:-80&style=feature:poi|visibility:off&key=AIzaSyCrk6QMTzO0LhPDfv36Ko5RCXWPER_5o8o'].join("");

			for (let venueName in appConfig.venueImages) {
				if (venue.name.toLowerCase() == venueName) {
					venue.image = appConfig.venueImages[venue.name.toLowerCase()];
				}
			}
			// Used for return to "something" button
			this.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, center, true);
			this.returnBtnActive = true;
			this.favouredVenue = true;
			this.mapsIndoorsService.mapsIndoors.setVenue(venue);
			this.mapsIndoorsService.mapsIndoors.fitVenue(venue.id)

			this.venue = venue;
			resolve(venue);
		});
	}
	// #endregion

	// #region || GET BUILDING BY ID
	async getBuildingById(buildingId) {
		let buildingRequest = this.miVenueService.getBuilding(buildingId);
		let building = await buildingRequest;
		return building
	}
	// #endregion


}

