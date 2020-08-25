import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class RoutingStateService {
    private history: string[] = [];

    constructor(
        private router: Router
    ) { }

    /**
     * @description Subscribes to navigation end event and updates history variable.
     * @memberof RoutingStateService
     */
    public loadRouting(): void {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd): void => {
                this.history = [...this.history, event.urlAfterRedirects];
                // History max-limit
                if (this.history.length > 20) {
                    this.history.shift();
                }
            });
    }

    /**
     * @description Returns previous route if any otherwise fallbacks to venue-page.
     * @returns {string} The previous route URL.
     * @memberof RoutingStateService
     */
    public getPreviousUrl(): string {
        return this.history[this.history.length - 2];
    }
}
