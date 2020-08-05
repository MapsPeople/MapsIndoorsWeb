import { Injectable } from '@angular/core';
import { SolutionService } from 'src/app/services/solution.service';
import { Location } from '../../../shared/models/location.interface';
import { SearchParameters } from '../../../shared/models/searchParameters.interface';

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
     * @param {SearchParameters} parameters - The parameters to search by.
     * @returns {Promise<Location[]>} - A promise with an array of locations.
     * @memberof SearchService
     */
    searchEntries(term: string, parameters: SearchParameters): Promise<Location[]> {
        const args: SearchParameters = {
            q: term,
            take: parameters.take,
            fields: 'name,description,aliases,categories,externalid',
            orderBy: 'relevance',
            near: parameters.near,
        };
        return Promise.all([
            this.getLocations(args),
            this.getGooglePlaces(term, parameters)
        ])
            .then((searchResults: any[]) => searchResults[0].concat(searchResults[1]))
            .catch((err) => console.log(err)); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
    }

    /**
     * @description Gets and returns matching MapsIndoors locations.
     * @param {*} parameters - Parameters to search by.
     * @returns {Promise<Location[]>} - Returns an array of filtered MapsIndoors POI's.
     * @memberof SearchService
     */
    getLocations(parameters: SearchParameters): Promise<Location[]> {
        return mapsindoors.LocationsService.getLocations(parameters)
            .then((locations: Location[]): Promise<Location[]> => this.setIcons(locations));
    }

    /**
     * @description Populates the locations with a matching advanced or solution location types icon.
     * @param {Location[]} locations - Array of MapsIndoors locations.
     * @returns {Promise<Location[]>} - A Promise with locations populated with icons.
     * @memberof SearchService
     */
    setIcons(locations: Location[]): Promise<Location[]> {
        return new Promise((resolve, reject): void => {
            if (this.locationTypes.length < 1) reject('No solution types');

            const unknownType = this.locationTypes.find((type): boolean => type.name.toLowerCase() === 'unknown');
            const unknownTypeIcon = unknownType ? unknownType.icon : '/assets/images/icons/noicon.png';
            const updatedLocations = [];

            for (const location of locations) {
                // Advanced icon
                if (location.properties.displayRule && location.properties.displayRule.icon && location.properties.displayRule.icon.length > 0) {
                    location.properties.iconUrl = location.properties.displayRule.icon;
                } else {
                    // Solution icon
                    try {
                        // Set type icon if the locations type matches the type name
                        location.properties.iconUrl = this.locationTypes.find((locationType): boolean => locationType.name.toLowerCase() === location.properties.type.toLowerCase()).icon;

                        // If transparent or no icon set
                        if (location.properties.iconUrl.includes('transparent' || 'noicon')) {
                            location.properties.iconUrl = unknownTypeIcon;
                        }
                    } catch {
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
     * @private
     * @param {string} term - The search term.
     * @param {SearchParameters} { getGoogleResults, countryCodeRestrictions } - Include Place Predictions. Restrict search to specific countries.
     * @returns {Promise<Location[]>} - Array of locations.
     * @memberof SearchService
     */
    private getGooglePlaces(term: string, { getGoogleResults, countryCodeRestrictions }: SearchParameters): Promise<Location[]> {
        return new Promise((resolve): void => {
            if (getGoogleResults) {
                this.autocompleteService.getPlacePredictions({
                    input: term,
                    componentRestrictions: { country: countryCodeRestrictions }
                }, (results): void => {
                    const places = (results || []).map((result): any => {
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
            } else resolve([]);
        });
    }
}