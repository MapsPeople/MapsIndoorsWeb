import { TestBed } from '@angular/core/testing';

import { SolutionService } from './solution.service';

describe('SolutionService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SolutionService = TestBed.get(SolutionService);
    expect(service).toBeTruthy();
  });
});
