import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { BehaviorSubject, Observable } from 'rxjs';

interface ThemeColors {
    primary: string;
    onPrimary: string;
    accent: string;
    onAccent: string;
}

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

    /**
     * Set solution colors.
     *
     */
    setColors(): void {
        const colors: ThemeColors = {
            primary: this.getColorAsHex(this.appConfig.appSettings.primaryColor) || '#2196F3',
            onPrimary: this.getColorAsHex(this.appConfig.appSettings.primaryText) || '#ffffff',
            accent: this.getColorAsHex(this.appConfig.appSettings.accentColor) || '#F44336',
            onAccent: this.getColorAsHex(this.appConfig.appSettings.accentText) || '#ffffff'
        };
        this.appConfigColors.next(colors);
    }

    /**
     * Get color as HEX color value.
     *
     * @private
     * @param {string} color The color that should be returned as a hex value.
     * @returns {string} Returns the given color as hex.
     */
    private getColorAsHex(color: string): string {
        if (!color) return;
        const hex = !color.includes('#') ? '#' + color : color;
        if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)) return hex.toLowerCase();
        else return color;
    }

    /**
     * Get specified theme colors for solution.
     *
     * @returns {Observable<ThemeColors>}
     */
    public getThemeColors(): Observable<ThemeColors> {
        return this.appConfigColors.asObservable();
    }
}
