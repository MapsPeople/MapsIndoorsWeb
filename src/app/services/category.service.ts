import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';

import { Venue } from '../shared/models/venue.interface';
import { Category } from '../shared/models/category.interface';
import { Location } from '../shared/models/location.interface';
import { SearchParameters } from '../shared/models/searchParameters.interface';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private solutionMainMenu: Category[] = [];
    private venueCategories = new BehaviorSubject<Category[]>([])

    constructor(
        private appConfigService: AppConfigService,
        private venueService: VenueService,
        private searchService: SearchService,
    ) {
        // App Config subscription
        this.appConfigService.getAppConfig()
            .subscribe((appConfig): void => {
                this.solutionMainMenu = appConfig.menuInfo && appConfig.menuInfo.mainmenu ?
                    appConfig.menuInfo.mainmenu :
                    null;
            });
        // Venue subscription
        this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
                this.updateCategoriesForVenue(venue.id);
            });
    }

    /**
     * Get mainMenu categories which have locations tied to them within the same venue as a observable.
     *
     * @returns {Observable<Category[]>}
     */
    public getMainMenuCategoriesObservable(): Observable<Category[]> {
        return this.venueCategories.asObservable();
    }

    /**
     * Populate categories observable with mainMenu categories which have locations tied to them within the same venue.
     *
     * @private
     * @param {string} venueId
     */
    private updateCategoriesForVenue(venueId: string): void {
        if (this.solutionMainMenu) {
            const filteredCategories: Category[] = [];

            for (const category of this.solutionMainMenu) {
                const searchParameters: SearchParameters = {
                    categories: [category.categoryKey],
                    take: 1,
                    venue: venueId
                };
                this.searchService.getLocations(searchParameters)
                    .then((locations: Location[]): void => {
                        if (locations.length > 0) {
                            filteredCategories.push(category);
                        } else {
                            // eslint-disable-next-line no-console
                            console.warn(`The ${category.name} category has no associated locations on this venue.`);
                        }
                    });
            }
            this.venueCategories.next(filteredCategories);
        }
    }
}