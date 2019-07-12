import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationImgComponent } from './location-img.component';

describe('LocationImgComponent', () => {
	let component: LocationImgComponent;
	let fixture: ComponentFixture<LocationImgComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [LocationImgComponent]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(LocationImgComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
