import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { Venue } from '../shared/models/venue.interface';

declare const mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class VenueService {

	miVenueService = mapsindoors.VenuesService;
	appConfig: any;
	venue: Venue;
	venuesLength: number;
	favouredVenue: boolean;
	fitVenues: boolean = true;
	returnBtnActive: boolean = true;

	private venueObservable = new BehaviorSubject<any>({});

	constructor(
		private appConfigService: AppConfigService,
		private mapsIndoorsService: MapsIndoorsService,
	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
	}

	// #region || GET ALL VENUES
	async getVenues() {
		const venues = await this.miVenueService.getVenues();
		for (const venue of venues) {
			const center = await [].concat(venue.anchor.coordinates).reverse();
			venue.anchor.center = center;
			venue.image = this.appConfig.venueImages[venue.name.toLowerCase()];
		}
		return venues;
	}
	// #endregion

	getVenueObservable(): Observable<any> {
		return this.venueObservable.asObservable();
	}

	/**
	 * @returns {boolean} Returns true if only venue in solution otherwise false.
	 * @memberof VenueService
	 */
	private isOnlyVenue() {
		return this.miVenueService.getVenues()
			.then((venues: Venue[]) => venues.length === 1);
	}

	// #region || GET VENUE BY ID
	async getVenueById(venueId) {
		const venueRequest = this.miVenueService.getVenue(venueId);
		const venue = await venueRequest;
		return venue;
	}
	// #endregion

	// #region || SET VENUE
	/**
	 * @description Sets the venue and adds the venue image from app configurations.
	 * @param {Venue} venue The selected venue.
	 * @param appConfig The configurations for current solution.
	 * @memberof VenueService
	 */
	async setVenue(venue, appConfig) {
		venue.anchor.center = [].concat(venue.anchor.coordinates).reverse();

		for (const venueName in appConfig.venueImages) {
			if (venue.name.toLowerCase() === venueName) {
				venue.image = appConfig.venueImages[venue.name.toLowerCase()];
			}
		}
		// Used for return to "something" button
		this.mapsIndoorsService.setReturnToValues(venue.venueInfo.name, venue.anchor.center, true);
		this.returnBtnActive = true;
		this.favouredVenue = true;
		this.mapsIndoorsService.mapsIndoors.setVenue(venue);
		this.mapsIndoorsService.mapsIndoors.fitVenue(venue.id);

		await this.getVenueBoundingBox(venue).then((bounds) => venue.boundingBox = bounds);
		venue.onlyVenue = await this.isOnlyVenue();

		this.venue = venue;
		this.venueObservable.next(venue);
	}

	/**
	 * @param {Venue} venue The current venue.
	 * @returns {Promise} Bounding box for venue.
	 * @memberof VenueService
	 */
	private getVenueBoundingBox(venue: Venue) {
		return new Promise((resolve, reject) => {
			const bounds = {
				east: -180,
				north: -90,
				south: 90,
				west: 180
			};
			venue.geometry.coordinates.reduce((bounds, ring: any) => {
				ring.reduce((bounds, coords) => {
					bounds.east = coords[0] >= bounds.east ? coords[0] : bounds.east;
					bounds.west = coords[0] <= bounds.west ? coords[0] : bounds.west;
					bounds.north = coords[1] >= bounds.north ? coords[1] : bounds.north;
					bounds.south = coords[1] <= bounds.south ? coords[1] : bounds.south;
					return bounds;
				}, bounds);
				return bounds;
			}, bounds);
			resolve(bounds);
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

