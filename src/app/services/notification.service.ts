import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor(
        public snackBar: MatSnackBar,
        private translateService: TranslateService
    ) { }

    /**
     * @description Show a snackbar with a message.
     * @param {string} value - The message to be shown.
     * @param {number} [duration] - How long the snackbar should be visible in milliseconds.
     * @memberof NotificationService
     */
    displayNotification(value: string, duration?: number): void {
        const milliseconds: number = duration ? duration : 5000;
        // Translating notification and opens snackBar with value
        this.translateService.get(value)
            .subscribe((notificationValue: string): void => {
                this.snackBar.open(notificationValue, '', {
                    duration: milliseconds
                });
            });
    }
}
