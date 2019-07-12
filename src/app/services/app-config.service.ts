import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
declare const mapsindoors: any;


@Injectable({
	providedIn: 'root'
})
export class AppConfigService {
	private appConfig = new BehaviorSubject<any>({});

	setAppConfig() {
		return new Promise((resolve, reject) => {
			mapsindoors.AppConfigService.getConfig().then((appConfig) => {
				appConfig.appSettings.title = appConfig.appSettings.title || "MapsIndoors";
				appConfig.appSettings.displayAliases = JSON.parse(appConfig.appSettings.displayAliases || false);
				this.appConfig.next(appConfig);
				resolve();
			});
		});
	}

	// #region || GET APP CONFIG
	getAppConfig(): Observable<any> {
		return this.appConfig.asObservable();
	}
	// #endregion
}