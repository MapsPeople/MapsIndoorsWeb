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
     * @description Set language for app based on browser settings.
     * @private
     * @returns {void}
     */
    private setLanguage(): void {
        const browserLanguage = window.navigator.language.toLowerCase();
        const language = {
            english: 'en',
            danish: 'da',
            portuguese: 'pt',
            portugueseBrazilian: 'pt-br',
            portuguesePortugal: 'pt-pt'
        };
        const supportedLanguage = Object.values(language).find((language: string): boolean => language === browserLanguage) ? true : false;

        if (supportedLanguage) {
            // English if already set in the constructor as a default language
            if (browserLanguage === language.english) {
                return;
            }

            // Set Brazilian and Portugal Portuguese to Portuguese
            if (browserLanguage === language.portugueseBrazilian || browserLanguage === language.portuguesePortugal) {
                this.translate.use(language.portuguese);
                return;
            }

            this.translate.use(browserLanguage);
        }
    }
}
