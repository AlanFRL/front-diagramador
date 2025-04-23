import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassDiagramImportComponent } from './class-diagram-import.component';

describe('ClassDiagramImportComponent', () => {
  let component: ClassDiagramImportComponent;
  let fixture: ComponentFixture<ClassDiagramImportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClassDiagramImportComponent]
    });
    fixture = TestBed.createComponent(ClassDiagramImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
