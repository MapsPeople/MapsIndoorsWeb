import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RoutingStateService } from './services/routing-state.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})

export class AppComponent {
    constructor(
        private translate: TranslateService,
        private routingState: RoutingStateService
    ) {
        routingState.loadRouting();
    }

    ngOnInit(): void {
        this.setLanguage();
    }

    /**
     * Set language based on the user's language code.
     * Language variations, e.g. "en-US" and "en-UK", will default to "en".
     * @private
     */
    private setLanguage(): void {
        // Slice off language variations since we do not support them, e.g.
        // "en-US" or "en-UK" will default to "en".
        const langCode = window.navigator.language.slice(0, 2);
        const supportedLanguages = ['da', 'fr', 'it', 'pt', 'es'];

        const isLanguageSupported = supportedLanguages.includes(langCode);

        isLanguageSupported ? this.translate.use(langCode) : this.translate.use('en');
    }
}
