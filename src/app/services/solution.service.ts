import { AppConfigService } from './app-config.service';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserAgentService } from './../services/user-agent.service';
import { environment } from '../../environments/environment';

declare let mapsindoors: any;
declare let Oidc: any;

@Injectable({
    providedIn: 'root'
})
export class SolutionService {
    appConfig: any;
    googleMapsApiTag: HTMLElement;
    miSdkApiTag: HTMLElement;

    constructor(
        private router: Router,
        private appConfigService: AppConfigService,
        private userAgentService: UserAgentService
    ) {
        this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
    }

    // #region || SOLUTION PROVIDER
    initializeApp(solutionId): Promise<void> {
        return new Promise(async (resolve, reject) => {
            await this.initializeGoogleMaps();
            await this.initializeSdk(solutionId);

            mapsindoors.MapsIndoors.onAuthRequired = this.initializeAuthenticationHandler(solutionId);

            try {
                await this.appConfigService.setAppConfig();
                await this.setSolution();
                resolve();
            } catch (e) {
                reject();
            }
        });
    }

    initializeGoogleMaps(): Promise<void> {
        return new Promise((resolve) => {
            if (this.googleMapsApiTag) {
                resolve();
            } else {
                this.googleMapsApiTag = document.createElement('script');
                this.googleMapsApiTag.setAttribute('type', 'text/javascript');
                this.googleMapsApiTag.setAttribute('src', '//maps.googleapis.com/maps/api/js?v=3&key=AIzaSyBNhmxW2OntKAVs7hjxmAjFscioPcfWZSc&libraries=geometry,places');
                document.body.appendChild(this.googleMapsApiTag);
                this.googleMapsApiTag.onload = () => resolve();
            }
        });
    }

    initializeSdk(solutionId): Promise<void> {
        return new Promise((resolve) => {
            this.miSdkApiTag = document.createElement('script');
            this.miSdkApiTag.setAttribute('type', 'text/javascript');
            this.miSdkApiTag.setAttribute('src', `${environment.sdkUrl}?apikey=${solutionId}`);
            document.body.appendChild(this.miSdkApiTag);
            this.miSdkApiTag.onload = () => resolve();
        });
    }

    initializeAuthenticationHandler(solutionId): Function {
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
            const gmKey: string = this.appConfig.appSettings.gmKey ? this.appConfig.appSettings.gmKey : 'AIzaSyBNhmxW2OntKAVs7hjxmAjFscioPcfWZSc';
            const gaKey: string = this.appConfig.appSettings.gaKey;

            // App Title
            const appTitle = document.getElementsByTagName('title')[0];
            appTitle.innerHTML = this.appConfig.appSettings.title || 'MapsIndoors';

            // Google Maps Key
            this.googleMapsApiTag.setAttribute('src', `//maps.googleapis.com/maps/api/js?v=3&key=${gmKey}&libraries=geometry,places`);

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
    //#endregion

    // #region || SOLUTION NAME
    getSolutionName(): String {
        return location.pathname.split('/')[1];
    }
    // #endregion

    // #region || GET SOLUTION
    /**
     * @description Get solution object.
     * @returns {Promise<any>} - Solution object.
     * @memberof SolutionService
     */
    public getSolution(): Promise<any> {
        return mapsindoors.SolutionsService.getSolution();
    }
    // #endregion

    // #region || GET SOLUTION ID
    /**
     * @description Get solution id.
     * @returns {Promise<string>} - Solution Id.
     * @memberof SolutionService
     */
    public getSolutionId(): Promise<string> {
        return new Promise((resolve, reject): void => {
            this.getSolution()
                .then(({ id }): void => {
                    resolve(id);
                })
                .catch((err): void => {
                    reject(err);
                });
        });
    }
    // #endregion

    // #region || GET USER ROLES
    /**
     * Gets a list of User Roles
     * @returns Array<AppUserRole>
     * @memberof SolutionService
     */
    getUserRoles(): Promise<Array<any>> {
        return mapsindoors.SolutionsService.getUserRoles();
    }
    // #endregion
}
