import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, ReplaySubject } from 'rxjs';

import { Venue } from '../shared/models/venue.interface';

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
     *
     * @returns {Observable<any>}
     */
    getAppConfig(): Observable<any> {
        return this.appConfig.asObservable();
    }

    /**
     * @description Set initial venue of app.
     * @param {Venue} venue - Venue object.
     * @memberof AppConfigService
     */
    setInitVenue(venue: Venue): void {
        this.initVenue.next(venue);
    }

    /**
     * @description Get venue from app initialization.
     * @returns {Observable<Venue>} - Returns the Venue object.
     * @memberof AppConfigService
     */
    getInitVenue(): Observable<Venue> {
        return this.initVenue.asObservable();
    }
}