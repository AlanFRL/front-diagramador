import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassDiagramExportComponent } from './class-diagram-export.component';

describe('ClassDiagramExportComponent', () => {
  let component: ClassDiagramExportComponent;
  let fixture: ComponentFixture<ClassDiagramExportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClassDiagramExportComponent]
    });
    fixture = TestBed.createComponent(ClassDiagramExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
