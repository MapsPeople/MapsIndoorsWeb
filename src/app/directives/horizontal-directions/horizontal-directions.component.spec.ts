import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalDirectionsComponent } from './horizontal-directions.component';

describe('HorizontalDirectionsComponent', () => {
	let component: HorizontalDirectionsComponent;
	let fixture: ComponentFixture<HorizontalDirectionsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [HorizontalDirectionsComponent]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HorizontalDirectionsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
