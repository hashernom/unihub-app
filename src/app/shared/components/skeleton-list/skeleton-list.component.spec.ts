import { TestBed } from '@angular/core/testing';
import { SkeletonListComponent } from './skeleton-list.component';

describe('SkeletonListComponent', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({});
    await TestBed.configureTestingModule({
      imports: [SkeletonListComponent],
    }).compileComponents();
  });

  it('should create with defaults', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.count()).toBe(3);
    expect(fixture.componentInstance.type()).toBe('card');
  });

  it('should render 3 card skeletons by default', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card-wrapped');
    expect(cards.length).toBe(3);
  });

  it('should render requested number of items', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.skeleton-card-wrapped');
    expect(cards.length).toBe(5);
  });

  it('should render item skeletons', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.componentRef.setInput('type', 'item');
    fixture.componentRef.setInput('count', 2);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.skeleton-item');
    expect(items.length).toBe(2);
  });

  it('should render avatar skeletons', () => {
    const fixture = TestBed.createComponent(SkeletonListComponent);
    fixture.componentRef.setInput('type', 'avatar');
    fixture.componentRef.setInput('count', 1);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.skeleton-avatar-row');
    expect(rows.length).toBe(1);
  });
});
