import { TestBed, inject } from '@angular/core/testing';

import { VenueService } from './venue.service';

describe('VenueService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VenueService]
    });
  });

  it('should be created', inject([VenueService], (service: VenueService) => {
    expect(service).toBeTruthy();
  }));
});
