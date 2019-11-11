import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormBuilder, FormGroup } from '@angular/forms';

declare const ga: Function;

@Component({
	templateUrl: './info-dialog.component.html',
})
export class InfoDialogComponent {
	form: FormGroup;
	dialogData: any;

	constructor(
		private fb: FormBuilder,
		public dialogRef: MatDialogRef<InfoDialogComponent>,
		@Inject(MAT_DIALOG_DATA) private data
	) {
		this.form = fb.group({
			appTitle: this.data.appTitle,
			appVersion: this.data.appVersion,
			sdkVersion: this.data.sdkVersion,
			locationName: this.data.locationName
		});
		this.dialogData = this.data;
	}

	onClose() {
		this.dialogRef.close();
		// Google Analytics
		ga('send', 'event', 'Search page', 'About dialog', 'Close button was clicked for About dialog');
	}


}
