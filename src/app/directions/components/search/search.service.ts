import { Injectable } from '@angular/core';
import { SolutionService } from 'src/app/services/solution.service';
import { Location, SearchParameters } from '@mapsindoors/typescript-interfaces';

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
     * Searches and returns MapsIndoors and Google Places locations.
     *
     * @param {string} term
     * @param {SearchParameters} parameters
     * @param {boolean} [includeGooglePlaces=false]
     * @param {(string | string[])} [countryCodeRestrictions='']
     * @returns {Promise<Location[]>}
     */
    searchEntries(term: string, parameters: SearchParameters, includeGooglePlaces: boolean = false, countryCodeRestrictions: string | string[] = ''): Promise<Location[]> {
        const args: SearchParameters = {
            q: term,
            take: parameters.take,
            fields: 'name,description,aliases,categories,externalId',
            orderBy: 'relevance',
            near: parameters.near,
        };
        return Promise.all([
            this.getLocations(args),
            this.getGooglePlaces(term, includeGooglePlaces, countryCodeRestrictions)
        ])
            .then((searchResults: any[]) => searchResults[0].concat(searchResults[1]))
            .catch((err) => console.log(err)); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
    }

    /**
     * Gets and returns matching MapsIndoors locations.
     *
     * @param {SearchParameters} parameters - Parameters to search by.
     * @returns {Promise<Location[]>} - Returns an array of filtered MapsIndoors POI's.
     */
    getLocations(parameters: SearchParameters): Promise<Location[]> {
        return mapsindoors.services.LocationsService.getLocations(parameters);
    }

    /**
     * Get google locations bases on query.
     *
     * @private
     * @param {string} term
     * @param {boolean} includeGooglePlaces
     * @param {(string | string[])} countryCodeRestrictions - Used for restricting results to specific countries (ISO 3166-1 Alpha-2 country code, case insensitive).
     * @returns {Promise<Location[]>}
     */
    private getGooglePlaces(term: string, includeGooglePlaces: boolean, countryCodeRestrictions: string | string[]): Promise<Location[]> {
        return new Promise((resolve): void => {
            if (includeGooglePlaces) {
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
                            }
                        };
                    });
                    resolve(places);
                });
            } else resolve([]);
        });
    }
}