import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let spectator: SpectatorService<NotificationService>;
    const createService = createServiceFactory({
        service: NotificationService,
        mocks: [MatSnackBar],
        imports: [
            TranslateModule.forRoot()
        ]
    });

    beforeEach(() => {
        spectator = createService();
    });

    it('exists', () => {
        expect(spectator.service).toBeDefined();
    });

    it('tries to open a snackbar notification', () => {
        spectator.service.displayNotification('some notification text');
        expect(spectator.service.snackBar.open).toHaveBeenCalledWith('some notification text', '', {
            duration: 5000
        });
    });
});
