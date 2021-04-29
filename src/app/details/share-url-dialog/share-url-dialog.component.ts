import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NotificationService } from 'src/app/services/notification.service';

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

    copyUrl(): void {
        try {
            const link = <HTMLInputElement>document.getElementById('shareUrl');
            link.focus();
            //TODO: .select is not supported maybe use viewChild
            link.select();
            document.execCommand('copy');

            this.notificationService.displayNotification('Notification.LinkCopied', 2000);
        } catch (err) {
            // Browser doesn't support this function
            this.notificationService.displayNotification('Notification.LinkCopiedError');
        }
    }

    onClose(): void {
        this.dialogRef.close();
    }
}
