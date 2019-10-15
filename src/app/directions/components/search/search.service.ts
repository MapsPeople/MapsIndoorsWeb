import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { SolutionService } from 'src/app/services/solution.service';

declare const mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class SearchService {
	autocompleteService = new google.maps.places.AutocompleteService();
	locationTypes: any[];

	constructor(
		private solutionService: SolutionService
	) {
		this.solutionService.getSolution()
			.then((solution) => this.locationTypes = solution.types);
	}

	/**
	 * @description Searches and returns MapsIndoors and Google Places locations.
	 * @param {string} term - The search term.
	 * @param {Object} searchParameters - The parameters to search by.
	 * @returns {Promise} - A promise with an array of locations.
	 * @memberof SearchService
	 */
	searchEntries(term: string, searchParameters) {
		return Promise.all([
			this.getLocations({
				q: term,
				take: searchParameters.take,
				near: searchParameters.startingPoint,
			}),
			this.getGooglePlaces(term, searchParameters)])
			.then((searchResults: any[]) => searchResults[0].concat(searchResults[1]))
			.catch((err) => console.log(err));
	}

	/**
	 * @description Gets and returns matching MapsIndoors locations.
	 * @param {*} parameters - Parameters to search by.
	 * @returns {Promise} - Returns MapsIndoors search results.
	 * @memberof SearchService
	 */
	getLocations(parameters) {
		return mapsindoors.LocationsService.getLocations(parameters)
			.then((locations) => this.setIcons(locations));
	}

	/**
	 * @description Populates the locations with a matching advanced or solution location types icon.
	 * @param {*} locations - Array of MapsIndoors locations.
	 * @returns {Promise} - A Promise with locations populated with icons.
	 * @memberof SearchService
	 */
	setIcons(locations: any[]) {
		return new Promise((resolve, reject) => {
			if (this.locationTypes.length < 1) reject('No solution types');

			const unknownType = this.locationTypes.find((type) => type.name.toLowerCase() === 'unknown');
			const unknownTypeIcon = unknownType ? unknownType.icon : '/assets/images/icons/noicon.png';
			const updatedLocations = [];

			for (const location of locations) {
				// Advanced icon
				if (location.properties.displayRule && location.properties.displayRule.icon && location.properties.displayRule.icon.length > 0) {
					location.properties.iconUrl = location.properties.displayRule.icon;
				}
				// Solution icon
				else {
					try {
						// Set type icon if the locations type matches the type name
						location.properties.iconUrl = this.locationTypes.find((locationType) => locationType.name.toLowerCase() === location.properties.type.toLowerCase()).icon;

						// If transparent or no icon set
						if (location.properties.iconUrl.includes('transparent' || 'noicon')) {
							location.properties.iconUrl = unknownTypeIcon;
						}
					}
					catch {
						location.properties.iconUrl = unknownTypeIcon;
					}
				}
				updatedLocations.push(location);
			}
			resolve(updatedLocations);
		});
	}

	/**
	 * @description Uses the search term to search for matching Google places results.
	 * @access Private
	 * @param {string} term - The search term.
	 * @param {boolean, string} { getGoogleResults, countryCodeRestrictions } - Include Place Predictions. Restrict search to specific countries.
	 * @returns {Promise} - Returns search results if any otherwise an empty array.
	 * @memberof SearchService
	 */
	private getGooglePlaces(term: string, { getGoogleResults, countryCodeRestrictions }) {
		return new Promise((resolve) => {
			if (getGoogleResults) {
				this.autocompleteService.getPlacePredictions({
					input: term,
					componentRestrictions: countryCodeRestrictions
				}, (results, status) => {
					const places = (results || []).map((result) => {
						return {
							type: 'Feature',
							properties: {
								type: 'google_places',
								placeId: result.place_id,
								name: result.structured_formatting.main_text,
								subtitle: result.structured_formatting.secondary_text || '',
								floor: 0,
								iconUrl: './assets/images/icons/google-poi.png'
							}
						};
					});
					resolve(places);
				});
			}
			else resolve([]);
		});
	}
}