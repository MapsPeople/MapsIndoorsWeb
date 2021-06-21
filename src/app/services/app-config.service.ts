import { Injectable } from '@angular/core';
import { Venue } from '@mapsindoors/typescript-interfaces';
import { Observable, BehaviorSubject, ReplaySubject } from 'rxjs';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    private appConfig = new BehaviorSubject<any>({});
    private initVenue = new ReplaySubject<Venue>(1);

    setAppConfig(): Promise<void> {
        return new Promise((resolve, reject): void => {
            mapsindoors.services.AppConfigService.getConfig().then((appConfig): void => {
                appConfig.appSettings.title = appConfig.appSettings.title || 'MapsIndoors';
                appConfig.appSettings.displayAliases = JSON.parse(appConfig.appSettings.displayAliases || false);
                this.appConfig.next(appConfig);

                resolve();
            }).catch((): void => {
                reject();
            });
        });
    }

    /**
     * Get appConfig object as observable.
     * @returns {Observable<any>}
     */
    getAppConfig(): Observable<any> {
        return this.appConfig.asObservable();
    }

    /**
     * Set initial Venue of the app.
     * @param {Venue} venue - Venue object.
     */
    setInitVenue(venue: Venue): void {
        this.initVenue.next(venue);
    }

    /**
     * Get venue from app initialization.
     * @returns {Observable<Venue>} - Returns the Venue object.
     */
    getInitVenue(): Observable<Venue> {
        return this.initVenue.asObservable();
    }

    /**
     * Get Google Maps API key or fallback to MapsIndoors API key.
     * @returns - Returns the API key as a string.
     */
    getApiKey(): string {
        const fallbackApiKey: string = 'AIzaSyBNhmxW2OntKAVs7hjxmAjFscioPcfWZSc';
        const googleMapsApiKey: string = this.appConfig.value.appSettings?.gmKey;
        const apiKey: string = googleMapsApiKey || fallbackApiKey;

        return apiKey;
    }
}
