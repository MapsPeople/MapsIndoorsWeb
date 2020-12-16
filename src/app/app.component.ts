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
        // Set default language
        translate.setDefaultLang('en');
        routingState.loadRouting();
    }

    ngOnInit(): void {
        this.setLanguage();
    }

    /**
     * Set language based on the user agents language if supported.
     * Language variants is mapped to the main key which is the same as the one used for the translations-filename.
     * @private
     */
    private setLanguage(): void {
        const userAgentLanguage = window.navigator.language;
        const supportedLanguages = {
            danish: ['da', 'da-DK'],
            french: ['fr', 'fr-FR', 'fr-CA'],
            italian: ['it', 'it-IT'],
            portuguese: ['pt', 'pt-BR', 'pt-PT'],
        };
        // Get key in SupportedLanguages object which includes the userAgentLanguage
        const languageKey: string = Object.keys(supportedLanguages).find((value: string) => supportedLanguages[value].includes(userAgentLanguage));

        if (languageKey) {
            // Danish
            if (languageKey === 'danish') this.translate.use('da');
            // French
            if (languageKey === 'french') this.translate.use('fr');
            // Italian
            if (languageKey === 'italian') this.translate.use('it');
            // Portuguese
            if (languageKey === 'portuguese') this.translate.use('pt');
        }
    }
}
