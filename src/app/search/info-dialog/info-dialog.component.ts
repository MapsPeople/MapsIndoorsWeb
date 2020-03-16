import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppConfigService } from './../../services/app-config.service';
import { AppMode } from '../../shared/enums';

@Component({
    templateUrl: './info-dialog.component.html',
})
export class InfoDialogComponent {
    form: FormGroup;
    dialogData: any;
    public isKioskMode: boolean;

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

    ngOnInit():void {
        this.appConfigService.getAppMode()
            .subscribe((mode): void => {
                this.isKioskMode = mode === AppMode.Kiosk ? true : false;
            });
    }

    /**
     * @description Close dialog.
     * @memberof InfoDialogComponent
     */
    public onClose(): void {
        this.dialogRef.close();
    }
}
