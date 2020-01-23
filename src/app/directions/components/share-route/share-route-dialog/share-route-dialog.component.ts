import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { NotificationService } from 'src/app/services/notification.service';

declare const mapsindoors: any;

enum PhoneInput {
    PhoneCountryCode,
    PhoneNumber
}

@Component({
    selector: 'share-route-dialog',
    templateUrl: './share-route-dialog.component.html',
    styleUrls: ['./share-route-dialog.component.scss']
})
export class ShareRouteDialogComponent implements AfterViewInit {
    public inputHasFocus: boolean;
    public activeInput = PhoneInput.PhoneNumber;
    public activeInputValue = '';
    @ViewChild('phoneNumberInput') private phoneNumberInput: ElementRef;

    public phoneNumberForm = new FormGroup({
        countryCode: new FormControl(this.data.phoneCountryCode, [
            Validators.required,
            Validators.minLength(1),
            Validators.maxLength(3),
        ]),
        phoneNumber: new FormControl('', [
            Validators.required,
            Validators.minLength(6),
            Validators.maxLength(10),
        ])
    })

    constructor(
        @Inject(MAT_DIALOG_DATA) public data,
        public dialogRef: MatDialogRef<ShareRouteDialogComponent>,
        private notificationService: NotificationService
    ) { }

    ngAfterViewInit(): void {
        this.phoneNumberInput.nativeElement.focus();
    }

    /**
     * @description Set value for active input.
     * @param {string} value - The value to set.
     * @memberof ShareRouteDialogComponent
     */
    public setValue(value: string): void {
        if (this.activeInput === PhoneInput.PhoneCountryCode) {
            this.phoneNumberForm.get('countryCode').setValue(value);
            return;
        }
        this.phoneNumberForm.get('phoneNumber').setValue(value);
    }

    /**
     * @description Update the activeInput and activeInputValue variables.
     * @param {string} inputName - Name of the input.
     * @param {string} value - Value of input.
     * @memberof ShareRouteDialogComponent
     */
    public updateInputVariables(inputName: string, value: string): void {
        this.activeInput = inputName === 'countryCode' ? PhoneInput.PhoneCountryCode : PhoneInput.PhoneNumber;
        this.activeInputValue = value;
    }

    /**
     * @description Send text message.
     * @memberof ShareRouteDialogComponent
     */
    public sendTextMessage(): void {
        mapsindoors.ShareService.directionsToPhone(
            this.data.venueId,
            this.data.originId,
            this.data.destination.id,
            this.phoneNumberForm.get('countryCode').value,
            this.phoneNumberForm.get('phoneNumber').value)
            .then((): void => {
                this.closeDialog();
                this.notificationService.displayNotification('ShareDialog.SmsSuccess');
            }).catch((): void => {
                this.closeDialog();
                this.notificationService.displayNotification('ShareDialog.SmsError');
            });
    }

    /**
     * @description Close dialog.
     * @memberof ShareRouteDialogComponent
     */
    public closeDialog(): void {
        this.dialogRef.close();
    }
}
