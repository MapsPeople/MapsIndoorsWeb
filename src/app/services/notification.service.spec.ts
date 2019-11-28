import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator/jest';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
	let snackBar: SpyObject<MatSnackBar>;

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
		snackBar = spectator.get(MatSnackBar);
	});

	it('exists', () => {
		expect(spectator.service).toBeDefined();
	});

	it('tries to open a snackbar notification', () => {
		spectator.service.displayNotification('some notification text');
		expect(snackBar.open).toHaveBeenCalledWith('some notification text', '', {
			duration: 4000
		});
	});
});
