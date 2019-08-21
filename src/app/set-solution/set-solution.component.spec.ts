import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SetSolutionComponent } from './set-solution.component';

describe('SetSolutionComponent', () => {
  let component: SetSolutionComponent;
  let fixture: ComponentFixture<SetSolutionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SetSolutionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SetSolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
