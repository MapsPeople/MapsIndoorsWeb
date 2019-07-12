import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material";
import { FormBuilder, FormGroup } from '@angular/forms';

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


}
