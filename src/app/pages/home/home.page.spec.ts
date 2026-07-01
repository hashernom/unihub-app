import { TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ReturnType<typeof TestBed.createComponent<HomePage>>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [],
    });
    TestBed.overrideComponent(HomePage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
