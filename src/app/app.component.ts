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

	ngOnInit() {
		this.setLanguage();
	}

	// #region || SET BROWSER LANGUAGE
	async setLanguage() {
		const language = await window.navigator.language;
		// Do nothing if browser language is english
		if (language === 'en') return;
		// Else check if browser language is supported in app
		// if( language == ("da" || "sp" || "la" || "ge"))
		else if (language === 'da') this.translate.use(language);
	}
	// #endregion
}
