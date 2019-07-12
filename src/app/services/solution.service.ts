import { AppConfigService } from './app-config.service';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare var mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class SolutionService {
	solution: any;
	appConfig: any;
	solutionName: string = "";
	googleMapsApiTag: HTMLElement;
	miSdkApiTag: HTMLElement;

	constructor(
		private appConfigService: AppConfigService,
	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
	}

	// #region || SOLUTION PROVIDER
	initializeApp() {
		return new Promise(async (resolve) => {
			await this.initializeGoogleMaps();
			await this.initializeSdk();
			await this.appConfigService.setAppConfig();
			await this.setSolution();
			resolve();
		});
	}

	initializeGoogleMaps() {
		return new Promise((resolve) => {
			this.googleMapsApiTag = document.createElement('script');
			this.googleMapsApiTag.setAttribute('type', 'text/javascript');
			this.googleMapsApiTag.setAttribute('src', `//maps.googleapis.com/maps/api/js?v=3&key=AIzaSyD8lfGCYzBMiIaGZM2JqHkSDfQbGZ-2zOM&libraries=geometry,places`);
			document.body.appendChild(this.googleMapsApiTag);
			this.googleMapsApiTag.onload = () => resolve();
		});
	}

	initializeSdk() {
		const solutionId: string = location.pathname.split('/')[1];
		return new Promise((resolve) => {
			this.miSdkApiTag = document.createElement('script');
			this.miSdkApiTag.setAttribute('type', 'text/javascript');
			this.miSdkApiTag.setAttribute('src', `${environment.sdkUrl}?apikey=${solutionId}`);
			document.body.appendChild(this.miSdkApiTag);
			this.miSdkApiTag.onload = () => resolve();
		});
	}

	setSolution() {
		return new Promise((resolve, reject) => {
			const gmKey: string = this.appConfig.appSettings.gmKey ? this.appConfig.appSettings.gmKey : "AIzaSyD8lfGCYzBMiIaGZM2JqHkSDfQbGZ-2zOM";
			const gaKey: string = this.appConfig.appSettings.gaKey;

			// App Title
			const appTitle = document.getElementsByTagName("title")[0];
			appTitle.innerHTML = this.appConfig.appSettings.title || "MapsIndoors";

			// Google Maps Key
			this.googleMapsApiTag.setAttribute('src',`//maps.googleapis.com/maps/api/js?v=3&key=${gmKey}&libraries=geometry,places`);

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

			const pageViewSingleKey = "ga('create', 'UA-63919776-8', 'auto'); ga('send', 'pageview');";
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
	setSolutionName() {
		this.solutionName = location.pathname.split('/')[1];
	}

	getSolutionName() {
		return this.solutionName;
	}
	// #endregion

	// #region || GET SOLUTION
	async getSolution() {
		const self = this;
		if (!this.solution) {
			await mapsindoors.SolutionsService.getSolution().then((s) => {
				self.solution = s;
			});
			return this.solution;
		}
		else {
			return this.solution;
		}
	}
	// #endregion

	// #region || GET SOLUTION ID
	async getSolutionId() {
		if (this.solution) {
			return this.solution.id;
		}
		else {
			await this.getSolution();
			return this.solution.id;
		}
	}
	// #endregion

	// #region || GET SOLUTION TYPES
	async getSolutionTypes() {
		if (this.solution) {
			return this.solution.types;
		}
		else {
			await this.getSolution();
			return this.solution.types;
		}
	}
	// #endregion
}
