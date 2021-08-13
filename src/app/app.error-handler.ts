import { ErrorHandler } from '@angular/core';
import { RewriteFrames } from '@sentry/integrations';
import * as Sentry from '@sentry/angular';

import { environment } from '../environments/environment';

/**
 * Custom error handler for error logging via Sentry.io.
 */
class SentryErrorHandler implements ErrorHandler {
    private rewriteFrames: any = new RewriteFrames({
        root: 'https://clients.mapsindoors.com/',
        iteratee: (frame) => frame
    });

    constructor() {
        Sentry.init({
            dsn: environment.sentryDsn,
            release: `maps-indoors-webapp@${environment.version}`,
            integrations: [this.rewriteFrames]
        });
    }

    handleError(error: any): void {
        Sentry.captureException(error.originalError || error);
        throw error;
    }
}

/**
 * Factory function to return an error handler depending on environment sentryDsn.
 * Default Error handler or SentryErrorHandler.
 */
export function errorHandlerFactory(): ErrorHandler {
    if (environment.sentryDsn) {
        return new SentryErrorHandler();
    }

    return new ErrorHandler();
}
