import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject, ReplaySubject } from 'rxjs';

import { Venue } from '../shared/models/venue.interface';
import { Location } from '../shared/models/location.interface';
import { AppMode } from '../shared/enums';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    private appConfig = new BehaviorSubject<any>({});
    private appMode = new ReplaySubject<AppMode>(1);
    private viewTimeout: number;
    private resetView = new Subject<boolean>();
    private resetViewTimer;
    private fixedOrigin = new ReplaySubject<Location>(1);
    private initVenue = new ReplaySubject<Venue>(1);

    // #region || APP CONFIG
    setAppConfig() {
        return new Promise((resolve, reject) => {
            mapsindoors.AppConfigService.getConfig().then((appConfig) => {
                appConfig.appSettings.title = appConfig.appSettings.title || 'MapsIndoors';
                appConfig.appSettings.displayAliases = JSON.parse(appConfig.appSettings.displayAliases || false);
                this.appConfig.next(appConfig);
                resolve();
            }).catch(() => {
                reject();
            });
        });
    }

    getAppConfig(): Observable<any> {
        return this.appConfig.asObservable();
    }
    // #endregion

    // #region || APP MODE
    /**
     * @description Set kiosk mode.
     * @memberof AppConfigService
     */
    setKioskMode(): void {
        this.appMode.next(AppMode.Kiosk);
    }

    /**
     * @description Get app initialization mode.
     * @returns {Observable<AppMode>} - Defines if the app is initialize normal or as a kiosk.
     * @memberof AppConfigService
     */
    getAppMode(): Observable<AppMode> {
        return this.appMode.asObservable();
    }
    // #endregion

    // #region || VIEW TIMEOUT
    /**
   * @description Add reset listeners.
   * @memberof AppConfigService
   */
    public addResetListeners(): void {
        ['touchstart', 'keyup']
            .forEach((evt): void =>
                document.addEventListener(evt, (): void => {
                    this.resetTimeoutTimer();
                })
            );
    }

    /**
     * @description Set the max idle time for app.
     * @param {number} value - The max idle value in seconds.
     * @memberof AppConfigService
     */
    public setViewTimeout(value: number): void {
        this.viewTimeout = Math.floor(value * 1000); // Convert to milliseconds.
    }

    /**
     * @description Start a timer that triggers the resetView observable when ended.
     * @memberof AppConfigService
     */
    public resetTimeoutTimer(): void {
        // Clear previous timeout
        if (this.resetViewTimer) {
            clearTimeout(this.resetViewTimer);
        }
        // Set new timeout
        this.resetViewTimer = setTimeout((): void => {
            this.resetView.next(true);
        }, this.viewTimeout);
    }

    /**
     * @description Event is send when resetView observable is triggered.
     * @returns {Observable<boolean>} - The resetView observable.
     * @memberof AppConfigService
     */
    public getResetView(): Observable<boolean> {
        return this.resetView.asObservable();
    }
    // #endregion

    // #region || FIXED ORIGIN
    /**
     * @description Set a location as fixed origin. All directions defaults to this as origin.
     * @param {Location} origin - The location object to set as fixed origin.
     * @memberof AppConfigService
     */
    public setFixedOrigin(origin: Location): void {
        this.fixedOrigin.next(origin);
    }

    /**
     * @description Get fixed origin location object.
     * @returns {Observable<Location>} - The fixed origin location object.
     * @memberof AppConfigService
     */
    public getFixedOrigin(): Observable<Location> {
        return this.fixedOrigin.asObservable();
    }
    // #endregion

    // #region || INIT VENUE
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
    // #endregion

}