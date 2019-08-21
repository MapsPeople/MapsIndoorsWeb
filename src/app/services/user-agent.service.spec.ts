import { TestBed } from '@angular/core/testing';

import { UserAgentService } from './user-agent.service';

describe('UserAgentService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: UserAgentService = TestBed.get(UserAgentService);
    expect(service).toBeTruthy();
  });
});
