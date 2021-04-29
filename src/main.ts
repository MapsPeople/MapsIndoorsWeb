import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { applyPolyfills, defineCustomElements } from '@mapsindoors/components/loader';

if (environment.production) {
    enableProdMode();
}

applyPolyfills().then(() => {
    defineCustomElements(window);
});

platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.log(err)); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
