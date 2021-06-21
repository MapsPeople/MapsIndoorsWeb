import { AppConfigService } from './app-config.service';
import { Injectable } from '@angular/core';
import { UserAgentService } from './../services/user-agent.service';
import { environment } from '../../environments/environment';
import { AppConfig, Solution } from '@mapsindoors/typescript-interfaces';
import { Loader as GoogleMapsApiLoader } from '@googlemaps/js-api-loader';

declare let mapsindoors: any;
declare let Oidc: any;

@Injectable({
    providedIn: 'root'
})
export class SolutionService {
    private appConfig: AppConfig;
    private miSdkApiTag: HTMLElement;

    constructor(
        private appConfigService: AppConfigService,
        private userAgentService: UserAgentService
    ) {
        this.appConfigService.getAppConfig().subscribe((appConfig: AppConfig) => this.appConfig = appConfig);
    }

    /**
     * Load the Google Maps API.
     * @returns {Promise<void>} Resolves when the Google Maps instance is loaded.
     */
    loadGoogleMapsApi(apiKey: string): Promise<void> {
        const loader = new GoogleMapsApiLoader({
            apiKey: apiKey,
            version: 'quarterly',
            libraries: ['places', 'geometry']
        });

        return loader.load();
    }

    /**
     * Insert script tag for MapsIndoors JavaScript SDK into the document and resolve when it is loaded.
     * @param solutionId {string} The MapsIndoors API key.
     * @returns {Promise<void>} Resolves when script is loaded.
     */
    insertMapsIndoorsJavaScriptSDK(solutionId: string): Promise<void> {
        return new Promise<void>((resolve): void => {
            if (this.miSdkApiTag) {
                mapsindoors.MapsIndoors.setMapsIndoorsApiKey(solutionId);
                return resolve();
            }

            this.miSdkApiTag = document.createElement('script');
            this.miSdkApiTag.setAttribute('type', 'text/javascript');
            this.miSdkApiTag.setAttribute('src', `${environment.sdkUrl}?apikey=${solutionId}`);
            document.body.appendChild(this.miSdkApiTag);
            this.miSdkApiTag.onload = (): void => resolve();
        });
    }

    initializeAuthenticationHandler(solutionId: string): Function {
        return ({ authClients = [], authIssuer = '' }) => {
            const oidcScript = document.createElement('script');
            oidcScript.setAttribute('type', 'text/javascript');
            oidcScript.setAttribute('src', '//www.unpkg.com/oidc-client@^1/dist/oidc-client.rsa256.slim.min.js');
            oidcScript.onload = () => {
                const authClient = authClients[0];
                const preferredIDP = authClient.preferredIDPs && authClient.preferredIDPs.length > 0 ? authClient.preferredIDPs[0] : '';
                const acr_values = preferredIDP ? [`idp:${preferredIDP}`] : [];
                //Setup the Oidc client with the auth settings in the event details
                const client = new Oidc.OidcClient({
                    authority: authIssuer,
                    client_id: authClient.clientId,
                    response_type: 'code',
                    scope: 'openid profile account client-apis',
                    redirect_uri: `${window.location.origin}/solution/set`,
                    acr_values: acr_values,
                    loadUserInfo: false
                });

                if (/[?|&|#]code=/.test(window.location.href)) {
                    client.processSigninResponse().then((response) => {
                        //Give the new authentication token to MapsIndoors:
                        mapsindoors.MapsIndoors.setAuthToken(response.access_token);


                    }).catch((err) => {
                        //Handle authentication errors here:
                        console.log(err);
                    });
                } else {
                    const origin_uri = client.settings.redirect_uri === `${window.location.origin}${window.location.pathname}` ? `/${solutionId}` : `${window.location.pathname}${window.location.search}${window.location.hash}`;
                    client.createSigninRequest({ state: { origin_uri } }).then(req => {
                        this.userAgentService.localStorage.setItem('mi:apiKey', solutionId);
                        this.userAgentService.localStorage.setItem('mi:originUri', origin_uri);
                        window.location.href = req.url;
                    });
                }
            };

            document.body.appendChild(oidcScript);
        };
    }

    setSolution(): Promise<void> {
        return new Promise((resolve) => {
            const gaKey: string = this.appConfig.appSettings.gaKey;

            // App Title
            const appTitle = document.getElementsByTagName('title')[0];
            appTitle.innerHTML = this.appConfig.appSettings.title || 'MapsIndoors';

            // Google Analytics - Tag Manger
            const gaTmScript_tag = document.createElement('script');
            gaTmScript_tag.async;
            gaTmScript_tag.src = 'https://www.googletagmanager.com/gtag/js?id=UA-63919776-8';
            document.head.appendChild(gaTmScript_tag);

            const globalTagSingleKey = `window.dataLayer = window.dataLayer || [];
                function gtag() { dataLayer.push(arguments); }
                gtag('js', new Date());
                gtag('config', 'UA-63919776-8');`;

            const globalTagMultipleKeys = `window.dataLayer = window.dataLayer || [];
                function gtag() { dataLayer.push(arguments); }
                gtag('js', new Date());
                gtag('config', 'UA-63919776-8');
                gtag('config', '${gaKey}');`;

            // Google Analytics - Data Layer
            const gaDlScript_tag = document.createElement('script');
            gaDlScript_tag.innerHTML = !gaKey ? globalTagSingleKey : globalTagMultipleKeys;
            document.head.appendChild(gaDlScript_tag);

            const pageViewSingleKey = 'ga(\'create\', \'UA-63919776-8\', \'auto\'); ga(\'send\', \'pageview\');';
            const pageViewMultipleKeys = `ga('create', 'UA-63919776-8', 'auto');
                ga('create', '${gaKey}', 'auto', 'clientTracker');
                ga('send', 'pageview');
                ga('clientTracker.send', 'pageview');`;

            // Google Analytics - Page View
            const gaPvScript_tag = document.createElement('script');
            gaPvScript_tag.type = 'text/javascript';
            const keys: string = !gaKey ? pageViewSingleKey : pageViewMultipleKeys;
            gaPvScript_tag.innerHTML = `(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})
                (window,document,'script','//www.google-analytics.com/analytics.js','ga');` + keys;
            document.body.appendChild(gaPvScript_tag);

            resolve();
        });
    }

    getSolutionName(): string {
        return location.pathname.split('/')[1];
    }

    /**
     * Get solution object.
     *
     * @returns {Promise<Solution>}
     */
    public getSolution(): Promise<Solution> {
        return mapsindoors.services.SolutionsService.getSolution();
    }

    /**
     * Get solution id.
     *
     * @returns {Promise<string>} - Solution Id.
     */
    public async getSolutionId(): Promise<string> {
        const { id } = await this.getSolution();
        return id;
    }

    /**
     * Gets a list of User Roles.
     *
     * @returns Array<AppUserRole>
     */
    getUserRoles(): Promise<Array<any>> {
        return mapsindoors.services.SolutionsService.getUserRoles();
    }
}
