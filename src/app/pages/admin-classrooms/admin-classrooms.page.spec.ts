import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminClassroomsPage } from './admin-classrooms.page';
import { EventService, type Classroom, type CalendarEvent } from '../../core/services/event.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { Router } from '@angular/router';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockClassrooms: Classroom[] = [
  {
    id: 'room-1',
    name: 'Aula 101',
    building: 'Edificio A',
    capacity: 30,
    resources: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'room-2',
    name: 'Aula 202',
    building: 'Edificio B',
    capacity: 25,
    resources: null,
    is_active: false,
    created_at: '2026-01-01T00:00:00Z',
  },
];

const mockAvailability: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Clase',
    description: null,
    event_type: 'class',
    classroom_id: 'room-1',
    professor_id: null,
    start_time: '2026-06-30T10:00:00Z',
    end_time: '2026-06-30T12:00:00Z',
    recurring_rule: null,
    color: '#3B82F6',
    is_cancelled: false,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('AdminClassroomsPage', () => {
  let component: AdminClassroomsPage;
  let fixture: ReturnType<typeof TestBed.createComponent<AdminClassroomsPage>>;
  let eventMock: {
    getClassrooms: ReturnType<typeof vi.fn>;
    getBuildings: ReturnType<typeof vi.fn>;
    updateClassroom: ReturnType<typeof vi.fn>;
    getClassroomAvailability: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: { handleHttpError: ReturnType<typeof vi.fn> };
  let routerMock: Router;

  beforeEach(async () => {
    eventMock = {
      getClassrooms: vi.fn().mockResolvedValue(mockClassrooms),
      getBuildings: vi.fn().mockResolvedValue(['Edificio A', 'Edificio B']),
      updateClassroom: vi.fn().mockResolvedValue(undefined),
      getClassroomAvailability: vi.fn().mockResolvedValue(mockAvailability),
    };
    errorHandlerMock = { handleHttpError: vi.fn() };
    routerMock = createRouterMock();

    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: eventMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    TestBed.overrideComponent(AdminClassroomsPage, {
      set: {
        imports: [...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AdminClassroomsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load classrooms and buildings when entering the view', async () => {
    await component.loadAll();
    expect(eventMock.getClassrooms).toHaveBeenCalled();
    expect(eventMock.getBuildings).toHaveBeenCalled();
    expect(component.classrooms.length).toBe(2);
    expect(component.filteredClassrooms.length).toBe(2);
    expect(component.buildings).toEqual(['Edificio A', 'Edificio B']);
  });

  it('should handle load errors via error handler', async () => {
    const err = new Error('network error');
    eventMock.getClassrooms.mockRejectedValue(err);
    await component.loadAll();
    expect(component.classrooms).toEqual([]);
    expect(component.error).toBe(err);
    expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(err, expect.any(Function));
  });

  it('should filter classrooms by building', async () => {
    await component.loadAll();
    component.filterByBuilding('Edificio A');
    expect(component.activeBuildingFilter).toBe('Edificio A');
    expect(component.filteredClassrooms.length).toBe(1);
    expect(component.filteredClassrooms[0].id).toBe('room-1');

    component.filterByBuilding(null);
    expect(component.filteredClassrooms.length).toBe(2);
  });

  it('should compute building counts', async () => {
    await component.loadAll();
    const counts = component.buildingsWithCount;
    expect(counts).toContainEqual({ name: 'Edificio A', count: 1 });
    expect(counts).toContainEqual({ name: 'Edificio B', count: 1 });
  });

  it('should toggle classroom active status', async () => {
    await component.loadAll();
    const target = component.classrooms[0];
    expect(target.is_active).toBe(true);
    await component.toggleActive(target);
    expect(eventMock.updateClassroom).toHaveBeenCalledWith('room-1', { is_active: false });
    expect(target.is_active).toBe(false);
  });

  it('should open availability modal for a classroom', async () => {
    await component.loadAll();
    const target = component.classrooms[0];
    await component.openAvailability(target);
    expect(component.selectedClassroom).toBe(target);
    expect(component.showAvailability).toBe(true);
    expect(eventMock.getClassroomAvailability).toHaveBeenCalledWith(
      'room-1',
      expect.any(String),
      expect.any(String),
    );
    expect(component.availabilityEvents.length).toBe(1);
  });

  it('should close availability modal and reset state', async () => {
    component.selectedClassroom = mockClassrooms[0];
    component.showAvailability = true;
    component.availabilityEvents = mockAvailability;
    component.closeAvailability();
    expect(component.showAvailability).toBe(false);
    expect(component.selectedClassroom).toBeNull();
    expect(component.availabilityEvents).toEqual([]);
  });

  it('should return events for a given day', () => {
    component.availabilityEvents = mockAvailability;
    const day = new Date(mockAvailability[0].start_time);
    const events = component.getEventsForDay(day);
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('evt-1');
  });
});
