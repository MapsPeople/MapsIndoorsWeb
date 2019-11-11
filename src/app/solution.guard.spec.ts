import { TestBed, inject } from '@angular/core/testing';

import { SolutionGuard } from './solution.guard';

describe('SolutionGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SolutionGuard]
    });
  });

  it('should ...', inject([SolutionGuard], (guard: SolutionGuard) => {
    expect(guard).toBeTruthy();
  }));
});
