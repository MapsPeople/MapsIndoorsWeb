import { Injectable } from '@angular/core';
declare var mapsindoors: any;


@Injectable({
	providedIn: 'root'
})
export class AppConfigService {
	appConfig: any;

	constructor() {
	}

	// #region || GET APP CONFIG
	async getConfig() {
		let self = this;
		if (!this.appConfig) {
			await mapsindoors.AppConfigService.getConfig().then(config => {
				config.appSettings.title = config.appSettings.title || "MapsIndoors";
				config.appSettings.displayAliases = JSON.parse(config.appSettings.displayAliases || false);
				self.appConfig = config;
			})
			return self.appConfig;
		}
		else {
			return this.appConfig;
		}
	}
	// #endregion
}