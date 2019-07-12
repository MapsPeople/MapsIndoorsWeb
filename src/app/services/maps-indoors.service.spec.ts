import { TestBed, inject } from '@angular/core/testing';

import { MapsIndoorsService } from './maps-indoors.service';

describe('MapsIndoorsService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [MapsIndoorsService]
		});
	});

	it('should be created', inject([MapsIndoorsService], (service: MapsIndoorsService) => {
		expect(service).toBeTruthy();
	}));
});
