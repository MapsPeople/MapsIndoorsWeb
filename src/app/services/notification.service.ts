import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
	providedIn: 'root'
})
export class NotificationService {

	constructor(
		public snackBar: MatSnackBar,
		private translateService: TranslateService
	) { }

	// #region || DISPLAY NOTIFICATION
	displayNotification(value: string, duration?: number) {
		const milliseconds: number = duration ? duration : 4000;
		// Translating notification and opens snackBar with value
		this.translateService.get(value).subscribe((notificationValue: string) => {
			this.snackBar.open(notificationValue, '', {
				duration: milliseconds
			});
		});
	}
	// #endregion
}