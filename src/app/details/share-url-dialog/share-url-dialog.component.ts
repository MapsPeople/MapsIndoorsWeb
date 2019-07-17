import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material";
import { FormBuilder, FormGroup } from '@angular/forms';
import { NotificationService } from 'src/app/services/notification.service';

declare const ga: Function;

@Component({
	templateUrl: './share-url-dialog.component.html',
})
export class ShareUrlDialogComponent {
	form: FormGroup;
	dialogData: any;

	constructor(
		private fb: FormBuilder,
		public dialogRef: MatDialogRef<ShareUrlDialogComponent>,
		private notificationService: NotificationService,
		@Inject(MAT_DIALOG_DATA) private data,
	) {
		this.form = fb.group({
			url: this.data.url
		});
		this.dialogData = this.data;
	}

	copyUrl() {
		try {
			const link = <HTMLInputElement>document.getElementById('shareUrl');
			link.focus();
			//TODO: .select is not supported maybe use viewChild
			link.select();
			document.execCommand('copy');

			this.notificationService.displayNotification("Notification.LinkCopied");
		} catch (err) {
			// Browser doesn't support this function
			this.notificationService.displayNotification("Notification.LinkCopiedError");
		}

		// // Code below is not supported by Safari yet
		// let url = window.location.href;
		// var event = (e: ClipboardEvent) => {
		//     e.clipboardData.setData('text/plain', url);
		//     e.preventDefault();
		//     document.removeEventListener('copy', event);
		// }
		// document.addEventListener('copy', event);
		// document.execCommand('copy');
		// if (document.execCommand('copy')) {
		// 	console.log('Copied to Clipboard');
		// }
		// else {
		// 	console.log('Something went wrong');
		// }
	}
	onClose() {
		this.dialogRef.close();
		// Google Analytics
		ga('send', 'event', 'Details page', 'Share POI dialog', 'Close dialog button was clicked for Share POI');
	}
}
