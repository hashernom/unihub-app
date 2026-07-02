import { TestBed } from '@angular/core/testing';
import { AdminUsersPage } from './admin-users.page';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

describe('AdminUsersPage', () => {
  let component: AdminUsersPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminUsersPage>>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [],
    });
    TestBed.overrideComponent(AdminUsersPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminUsersPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the empty state', () => {
    fixture.detectChanges();
    const emptyState = fixture.nativeElement.querySelector('app-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should render a back button to the admin dashboard', () => {
    fixture.detectChanges();
    const backButton = fixture.nativeElement.querySelector('ion-back-button');
    expect(backButton).toBeTruthy();
    expect(backButton.getAttribute('defaultHref')).toBe('/admin/dashboard');
  });
});
