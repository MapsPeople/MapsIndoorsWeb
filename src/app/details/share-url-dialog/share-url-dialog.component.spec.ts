import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareUrlDialogComponent } from './share-url-dialog.component';

describe('ShareUrlDialogComponent', () => {
	let component: ShareUrlDialogComponent;
	let fixture: ComponentFixture<ShareUrlDialogComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ShareUrlDialogComponent]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ShareUrlDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
