import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppConfigService } from './../../services/app-config.service';

@Component({
    templateUrl: './info-dialog.component.html',
})
export class InfoDialogComponent {
    form: FormGroup;
    dialogData: any;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<InfoDialogComponent>,
        private appConfigService: AppConfigService,
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

    /**
     * @description Close dialog.
     * @memberof InfoDialogComponent
     */
    public onClose(): void {
        this.dialogRef.close();
    }
}
