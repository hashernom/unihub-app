import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AdminHelpQueriesPage } from './admin-help-queries.page';
import { HelpQueryService, type HelpQueryGroup, type WeeklyResolution } from '../../core/services/help-query.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';

/* eslint-disable @typescript-eslint/no-empty-function */
vi.mock('chart.js', () => ({
  Chart: class {
    static register() {}
    constructor() {}
    destroy() {}
  },
  registerables: [],
}));
/* eslint-enable @typescript-eslint/no-empty-function */

function createMockGroups(): HelpQueryGroup[] {
  return [
    {
      normalized_text: 'como inscribo',
      query_text: '¿Cómo me inscribo?',
      count: 5,
      sample_ids: ['q-1', 'q-2'],
    },
    {
      normalized_text: 'restablecer contrasena',
      query_text: '¿Cómo restablezco mi contraseña?',
      count: 3,
      sample_ids: ['q-3'],
    },
  ];
}

const mockWeeklyStats: WeeklyResolution[] = [
  { week: '2026-W25', total: 10, resolved: 7, rate: 0.7 },
  { week: '2026-W26', total: 20, resolved: 15, rate: 0.75 },
];

describe('AdminHelpQueriesPage', () => {
  let component: AdminHelpQueriesPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminHelpQueriesPage>>;
  let router: Router;
  let helpQueryMock: {
    getGroupedUnresolvedQueries: ReturnType<typeof vi.fn>;
    getTopUnresolvedQueries: ReturnType<typeof vi.fn>;
    getWeeklyResolutionStats: ReturnType<typeof vi.fn>;
    markAllInGroupResolved: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    helpQueryMock = {
      getGroupedUnresolvedQueries: vi.fn(),
      getTopUnresolvedQueries: vi.fn(),
      getWeeklyResolutionStats: vi.fn(),
      markAllInGroupResolved: vi.fn(),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: HelpQueryService, useValue: helpQueryMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        provideRouter([]),
      ],
    });
    TestBed.overrideComponent(AdminHelpQueriesPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminHelpQueriesPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load queries, top queries and weekly stats on ionViewWillEnter', async () => {
    const mockGroups = createMockGroups();
    helpQueryMock.getGroupedUnresolvedQueries.mockResolvedValue(mockGroups);
    helpQueryMock.getTopUnresolvedQueries.mockResolvedValue([mockGroups[0]]);
    helpQueryMock.getWeeklyResolutionStats.mockResolvedValue(mockWeeklyStats);

    await component.loadAll();

    expect(helpQueryMock.getGroupedUnresolvedQueries).toHaveBeenCalled();
    expect(helpQueryMock.getTopUnresolvedQueries).toHaveBeenCalledWith(10);
    expect(helpQueryMock.getWeeklyResolutionStats).toHaveBeenCalled();
    expect(component.groups).toEqual(mockGroups);
    expect(component.topQueries).toHaveLength(1);
    expect(component.weeklyStats).toEqual(mockWeeklyStats);
    expect(component.loading).toBe(false);
  });

  it('should handle load error and call error handler', async () => {
    const err = new Error('Network error');
    helpQueryMock.getGroupedUnresolvedQueries.mockRejectedValue(err);

    await component.loadAll();

    expect(component.groups).toHaveLength(0);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
    expect(component.loading).toBe(false);
  });

  it('should mark all queries in a group as resolved', async () => {
    const mockGroups = createMockGroups();
    helpQueryMock.getGroupedUnresolvedQueries.mockResolvedValue(mockGroups);
    helpQueryMock.getTopUnresolvedQueries.mockResolvedValue([mockGroups[0]]);
    helpQueryMock.getWeeklyResolutionStats.mockResolvedValue(mockWeeklyStats);
    helpQueryMock.markAllInGroupResolved.mockResolvedValue(undefined);
    helpQueryMock.getWeeklyResolutionStats.mockResolvedValue(mockWeeklyStats);

    await component.loadAll();

    const target = component.groups[0];
    await component.markResolved(target);

    expect(helpQueryMock.markAllInGroupResolved).toHaveBeenCalledWith(target.normalized_text);
    expect(component.groups.some((g) => g.normalized_text === target.normalized_text)).toBe(false);
    expect(component.topQueries.some((g) => g.normalized_text === target.normalized_text)).toBe(false);
    expect(component.toastMessage).toBe('Marcadas como resueltas');
  });

  it('should create FAQ from query and navigate', async () => {
    const mockGroups = createMockGroups();
    helpQueryMock.getGroupedUnresolvedQueries.mockResolvedValue(mockGroups);
    helpQueryMock.getTopUnresolvedQueries.mockResolvedValue([mockGroups[0]]);
    helpQueryMock.getWeeklyResolutionStats.mockResolvedValue(mockWeeklyStats);
    helpQueryMock.markAllInGroupResolved.mockResolvedValue(undefined);

    await component.loadAll();

    const target = component.groups[0];
    const navigateSpy = vi.spyOn(router, 'navigate');
    await component.createFaqFromQuery(target);

    expect(helpQueryMock.markAllInGroupResolved).toHaveBeenCalledWith(target.normalized_text);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/faq/new'], {
      state: { question: target.query_text },
    });
  });

  it('should compute overall resolution rate', () => {
    component.weeklyStats = mockWeeklyStats;
    expect(component.overallRate).toBe(73.3);
  });
});
