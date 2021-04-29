import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare const ga: Function;

@Injectable({
    providedIn: 'root'
})
export class TrackerService {
    private clientTrackerId: string;

    constructor(
        private appConfigService: AppConfigService,
        private router: Router,
    ) {
        this.appConfigService.getAppConfig()
            .subscribe((appConfig): void => this.clientTrackerId = appConfig.appSettings.gaKey ? appConfig.appSettings.gaKey : '');
        this.sendPageViewEvents();
    }

    /**
     * @description Send a Google Analytics event.
     * @param {string} category - The event category, eg. "Directions".
     * @param {string} action - The event action, eg. "Clicked "Get Directions".
     * @param {string} label - The event description, eg. ""{locationName}" – {locationId}".
     * @param {boolean} [internally=false] - "True" if the event only shall be used internally.
     * @memberof TrackerService
     */
    public sendEvent(category: string, action: string, label: string, internally = false): void {
        ga('send', {
            hitType: 'event',
            eventCategory: category,
            eventAction: action,
            eventLabel: label
        });

        if (!internally && this.clientTrackerId) {
            ga('clientTracker.send', {
                hitType: 'event',
                eventCategory: category,
                eventAction: action,
                eventLabel: label
            });
        }
    }

    /**
     * @description Send page view events to Google Analytics.
     * @private
     * @memberof TrackerService
     */
    private sendPageViewEvents(): void {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd): void => {
                ga('set', 'page', event.urlAfterRedirects);
                ga('send', 'pageview');
                if (this.clientTrackerId) {
                    ga('clientTracker.send', 'pageview');
                }
            });
    }

}