import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, NavigationExtras } from '@angular/router';
import { Observable } from 'rxjs';

import { AppConfigService } from './services/app-config.service';
import { SolutionService } from './services/solution.service';
import { UserAgentService } from './services/user-agent.service';

declare let mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class SolutionGuard implements CanActivate {
    constructor(
        private solutionService: SolutionService,
        private appConfigService: AppConfigService,
        private userAgentService: UserAgentService,
        private router: Router
    ) {
    }

    canActivate(next: ActivatedRouteSnapshot): Observable<boolean> | Promise<boolean> | boolean {
        return new Promise((resolve) => {
            const solutionId: string = next.params.solutionName;

            return this.solutionService.insertMapsIndoorsJavaScriptSDK(solutionId)
                .then(() => mapsindoors.MapsIndoors.onAuthRequired = this.solutionService.initializeAuthenticationHandler(solutionId))
                .then(() => this.appConfigService.setAppConfig())
                .then(() => {
                    const apiKey = this.appConfigService.getApiKey();
                    return this.solutionService.loadGoogleMapsApi(apiKey);
                })
                .then(() => this.solutionService.setSolution())
                .then(() => {
                    this.userAgentService.localStorage.setItem('MI:suggestedSolutionId', next.params.solutionName);

                    resolve(true);
                })
                .catch(() => {
                    const navigationExtras: NavigationExtras = { state: { guard: true } };
                    this.router.navigate(['/solution/set'], navigationExtras);

                    resolve(false);
                });
        });
    }
}
