import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, NavigationExtras } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';

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
        private oauthService: OAuthService,
        private router: Router
    ) { }

    canActivate(next: ActivatedRouteSnapshot): Observable<boolean> | Promise<boolean> | boolean {
        return new Promise((resolve) => {
            const solutionId: string = next.params.solutionName;

            mapsindoors.MapsIndoors.onAuthRequired = ({ authClients = [], authIssuer = '' }) => {
                const authClient = authClients[0];
                const preferredIDP = authClient.preferredIDPs && authClient.preferredIDPs.length > 0 ? authClient.preferredIDPs[0] : '';
                //Setup the OAuthService client with the AuthConfig
                const authConfig: AuthConfig = {
                    clearHashAfterLogin: true,
                    issuer: authIssuer,
                    clientId: authClient.clientId,
                    responseType: 'code',
                    scope: 'openid profile account client-apis',
                    redirectUri: this.getRedirectUri(),
                    postLogoutRedirectUri: `${window.location.origin}/solution/set`,
                    customQueryParams: { acr_values: preferredIDP ? `idp:${preferredIDP}` : '' },
                };

                this.oauthService.configure(authConfig);
                this.oauthService.loadDiscoveryDocumentAndLogin().then(hasReceivedTokens => {
                    if (hasReceivedTokens) {
                        mapsindoors.MapsIndoors.setAuthToken(this.oauthService.getAccessToken());
                    }
                });
            };

            mapsindoors.MapsIndoors.setMapsIndoorsApiKey(solutionId.toLowerCase());
            return this.appConfigService.setAppConfig()
                .then(async () => {
                    const apiKey = this.appConfigService.getApiKey();
                    await this.solutionService.loadGoogleMapsApi(apiKey);
                    await this.solutionService.setSolution();
                    this.userAgentService.localStorage.setItem('MI:suggestedSolutionId', next.params.solutionName);
                    resolve(true);
                }).catch(() => {
                    const navigationExtras: NavigationExtras = { state: { guard: true } };
                    this.router.navigate(['/solution/set'], navigationExtras);
                    resolve(false);
                });
        });
    }

    /**
     * Builds the redirect uri.
     * @returns {string}
     */
    private getRedirectUri(): string {
        const finalUrl = this.router?.getCurrentNavigation()?.finalUrl;
        const path = finalUrl ? this.router.serializeUrl(finalUrl) : `${window.location.pathname}${window.location.search}`;
        const url = new URL(`${window.location.origin}${path}`);
        url.searchParams.delete('code');
        url.searchParams.delete('scope');
        url.searchParams.delete('session_state');
        url.searchParams.delete('state');

        return url.toString();
    }
}
