import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, NavigationExtras } from '@angular/router';
import { Observable } from 'rxjs';

import { SolutionService } from './services/solution.service';
import { UserAgentService } from './services/user-agent.service';

@Injectable({
    providedIn: 'root'
})
export class SolutionGuard implements CanActivate {

    constructor(
        private solutionService: SolutionService,
        private userAgentService: UserAgentService,
        private router: Router
    ) { }

    canActivate(
        next: ActivatedRouteSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {
        return new Promise((resolve) => {
            this.solutionService.initializeApp(next.params.solutionName)
                .then(() => {
                    this.userAgentService.localStorage.setItem('MI:suggestedSolutionId', next.params.solutionName);
                    resolve(true);
                })
                .catch(() => {
                    const navigationExtras: NavigationExtras = {
                        state: {
                            guard: true
                        }
                    };
                    this.router.navigate(['/solution/set'], navigationExtras);
                    resolve(false);
                });
        });
    }
}
