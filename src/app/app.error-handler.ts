import { ErrorHandler } from '@angular/core';
import * as Sentry from '@sentry/browser';

import { environment } from '../environments/environment';

/**
 * Custom error handler for error logging via Sentry.io.
 */
class SentryErrorHandler implements ErrorHandler {
    constructor() {
        Sentry.init({
            dsn: environment.sentryDsn,
            release: `maps-indoors-webapp@${environment.version}`
        });
    }

    handleError(error: any):void {
        Sentry.captureException(error.originalError || error);
        throw error;
    }
}

/**
 * Factory function to return an error handler depending on environment sentryDsn.
 * Default Error handler or SentryErrorHandler.
 */
export function errorHandlerFactory():ErrorHandler {
    if (environment.sentryDsn) {
        return new SentryErrorHandler();
    }
    return new ErrorHandler();
}
