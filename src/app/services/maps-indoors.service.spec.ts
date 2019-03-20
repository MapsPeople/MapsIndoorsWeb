import { TestBed, inject } from '@angular/core/testing';

import { MapsindoorsService } from './mapsindoors.service';

describe('MapsindoorsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MapsindoorsService]
    });
  });

  it('should be created', inject([MapsindoorsService], (service: MapsindoorsService) => {
    expect(service).toBeTruthy();
  }));
});
