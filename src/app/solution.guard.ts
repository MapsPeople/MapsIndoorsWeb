import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, NavigationExtras } from '@angular/router';
import { Observable } from 'rxjs';

import { SolutionService } from './services/solution.service';

@Injectable({
    providedIn: 'root'
})
export class SolutionGuard implements CanActivate {

    constructor(
        private solutionService: SolutionService,
        private router: Router
    ) { }

    canActivate(
        next: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {
        return new Promise((resolve, reject) => {
            this.solutionService.initializeApp(next.params.solutionName)
                .then(() => {
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
                })
        });
    }
}
