import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';
import { VenueService } from './venue.service';
import { SearchService } from '../directions/components/search/search.service';

import { Category, Location, SearchParameters, Venue } from '@mapsindoors/typescript-interfaces';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private solutionMainMenu: Category[] = [];
    private venueCategories = new BehaviorSubject<Category[]>([]);
    private venueId: string;

    constructor(
        private appConfigService: AppConfigService,
        private venueService: VenueService,
        private searchService: SearchService,
    ) {
        // App Config subscription
        this.appConfigService.getAppConfig()
            .pipe(
                filter((appConfig): boolean => appConfig.menuInfo && appConfig.menuInfo.mainmenu && appConfig.menuInfo.mainmenu.length > 0),
                map((appConfig): Category[] => appConfig.menuInfo.mainmenu as Category[]),
            ).subscribe((mainMenu: Category[]): void => {
                this.solutionMainMenu = mainMenu;
            });
        // Venue subscription
        this.venueService.getVenueObservable()
            .subscribe((venue: Venue): void => {
                this.venueId = venue.id;
                this.updateCategoriesForVenue();
            });

        // Category list is updated whenever user roles is set.
        mapsindoors.services.LocationsService.addListener('update_completed', () => {
            this.updateCategoriesForVenue();
        });
    }

    /**
     * Get mainMenu categories which have locations tied to them within the same venue as a observable.
     * @returns {Observable<Category[]>}
     */
    public getMainMenuCategoriesObservable(): Observable<Category[]> {
        return this.venueCategories
            .asObservable()
            .pipe(filter((categories) => !!categories));
    }

    /**
     * Populate categories observable with mainMenu categories which have locations tied to them within the same venue.
     */
    public updateCategoriesForVenue(): void {
        if (this.solutionMainMenu) {
            const filteredCategories: Category[] = [];

            for (const category of this.solutionMainMenu) {
                const searchParameters: SearchParameters = {
                    categories: [category.categoryKey],
                    take: 1,
                    venue: this.venueId
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
