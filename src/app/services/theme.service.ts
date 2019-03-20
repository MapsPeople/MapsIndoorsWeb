import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';

@Injectable({
	providedIn: 'root'
})
export class ThemeService {
	appConfig: any;
	colors: any;
	constructor(
		private appConfigService: AppConfigService,
	) { }

	// #region || GET THEME COLORS
	async getThemeColors() {
		let self = this;

		if (!this.appConfig) {
			await this.appConfigService.getConfig().then(config => {
				self.appConfig = config;
			}).then(async config => {
				await self.setColors();
			});
			return this.colors;
		}
		else {
			return this.colors;
		}
	}
	// #endregion

	// #region || SET THEME COLORS
	async setColors() {
		let self = this;
		let colors = {
			primary: await this.isHex(self.appConfig.appSettings.primaryColor) || '#2196F3',
			onPrimary: await this.isHex(self.appConfig.appSettings.primaryText) || '#ffffff',
			accent: await this.isHex(self.appConfig.appSettings.accentColor) || '#F44336',
			onAccent: await this.isHex(self.appConfig.appSettings.accentText) || '#ffffff'
		}
		this.colors = colors;
	}

	// NOTE: Safe for later use
	// hexToRGB(hex, alpha?) {
	// 	let r = parseInt(hex.slice(1, 3), 16);
	// 	let g = parseInt(hex.slice(3, 5), 16);
	// 	let b = parseInt(hex.slice(5, 7), 16);
	// 	if (alpha) {
	// 		return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	// 	} else {
	// 		return "rgb(" + r + ", " + g + ", " + b + ")";
	// 	}
	// }

	async isHex(color) {
		if (!color) {
			return
		}
		let hex = !color.includes('#') ? '#' + color : color
		if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)) {
			return hex.toLowerCase();
		}
		else {
			return color
		}
	}
	// #endregion
}
