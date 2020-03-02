import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    appConfig: any;
    private appConfigColors = new BehaviorSubject<any>({});

    constructor(
        private appConfigService: AppConfigService,
    ) {
        this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
    }

    // #region || SET THEME COLORS
    setColors() {
        return new Promise(async (resolve) => {
            const colors = {
                primary: await this.getColorAsHex(this.appConfig.appSettings.primaryColor) || '#2196F3',
                onPrimary: await this.getColorAsHex(this.appConfig.appSettings.primaryText) || '#ffffff',
                accent: await this.getColorAsHex(this.appConfig.appSettings.accentColor) || '#F44336',
                onAccent: await this.getColorAsHex(this.appConfig.appSettings.accentText) || '#ffffff'
            };
            this.appConfigColors.next(colors);
            resolve();
        });
    }

    // NOTE: Save for later use
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

    /**
     *
     * @param {any} color The color that should be returned as a hex value.
     * @returns {any} Returns the given color as hex.
     */
    getColorAsHex(color) {
        if (!color) return;
        const hex = !color.includes('#') ? '#' + color : color;
        if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)) return hex.toLowerCase();
        else return color;
    }
    // #endregion

    // #region || GET THEME COLORS
    getThemeColors() {
        return this.appConfigColors.asObservable();
    }
    // #endregion
}
