import { Injectable } from '@angular/core';
import { Router, RouterEvent, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class RoutingStateService {
	private history: NavigationEnd[] = [];

	constructor(
		private router: Router
	) { }

	/**
	 * @description Subscribes to navigation end event and updates history variable.
	 * @memberof RoutingStateService
	 */
	public loadRouting(): void {
		// TODO: Move map.component analytics page-view event in here
		this.router.events
			.pipe(
				filter(
					(event: RouterEvent) => {
						return (event instanceof NavigationEnd);
					}
				)
			)
			.subscribe((urlAfterRedirects: NavigationEnd) => {
				this.history = [...this.history, urlAfterRedirects];
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
	public getPreviousUrl() {
		return this.history[this.history.length - 2];
	}
}
