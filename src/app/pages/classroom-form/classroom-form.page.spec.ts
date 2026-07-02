import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { ClassroomFormPage } from './classroom-form.page';
import { EventService, type Classroom } from '../../core/services/event.service';
import { FormValidationService } from '../../core/services/form-validation.service';
import { IONIC_STUBS } from '../../../testing/ionic-stubs';
import { createRouterMock } from '../../../testing/mock-factories';

const mockClassroom: Classroom = {
  id: 'room-1',
  name: 'Aula 101',
  building: 'Edificio A',
  capacity: 30,
  resources: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('ClassroomFormPage', () => {
  let component: ClassroomFormPage;
  let fixture: ReturnType<typeof TestBed.createComponent<ClassroomFormPage>>;
  let eventMock: {
    getClassrooms: ReturnType<typeof vi.fn>;
    createClassroom: ReturnType<typeof vi.fn>;
    updateClassroom: ReturnType<typeof vi.fn>;
  };
  let routerMock: Router;
  let routeMock: { snapshot: { paramMap: { get: ReturnType<typeof vi.fn> } } };
  let formValidationMock: { getErrorMessage: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    eventMock = {
      getClassrooms: vi.fn(),
      createClassroom: vi.fn(),
      updateClassroom: vi.fn(),
    };
    routerMock = createRouterMock();
    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };
    formValidationMock = { getErrorMessage: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: EventService, useValue: eventMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: FormValidationService, useValue: formValidationMock },
      ],
    });
    TestBed.overrideComponent(ClassroomFormPage, {
      set: {
        imports: [FormsModule, ...IONIC_STUBS],
      },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ClassroomFormPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load classroom in edit mode', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('room-1');
    eventMock.getClassrooms.mockResolvedValue([mockClassroom]);

    fixture.detectChanges();
    await vi.waitFor(() => component.name === mockClassroom.name);

    expect(component.isEdit).toBe(true);
    expect(component.classroomId).toBe('room-1');
    expect(component.name).toBe(mockClassroom.name);
    expect(component.building).toBe(mockClassroom.building);
    expect(component.capacity).toBe(mockClassroom.capacity);
  });

  it('should create a new classroom when saving in create mode', async () => {
    vi.useFakeTimers();
    eventMock.createClassroom.mockResolvedValue(undefined);

    component.name = 'Aula 202';
    component.building = 'Edificio B';
    component.capacity = 25;

    await component.save();

    expect(eventMock.createClassroom).toHaveBeenCalledWith({
      name: 'Aula 202',
      building: 'Edificio B',
      capacity: 25,
    });
    expect(component.toastMessage).toBe('Aula creada');

    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/classrooms']);

    vi.useRealTimers();
  });

  it('should update an existing classroom when saving in edit mode', async () => {
    vi.useFakeTimers();
    component.isEdit = true;
    component.classroomId = 'room-1';
    component.name = 'Aula 101 Updated';
    component.building = 'Edificio A';
    component.capacity = 35;
    eventMock.updateClassroom.mockResolvedValue(undefined);

    await component.save();

    expect(eventMock.updateClassroom).toHaveBeenCalledWith('room-1', {
      name: 'Aula 101 Updated',
      building: 'Edificio A',
      capacity: 35,
    });
    expect(component.toastMessage).toBe('Aula actualizada');

    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/classrooms']);

    vi.useRealTimers();
  });

  it('should show a toast when the classroom name is empty on save', async () => {
    component.name = '';
    component.capacity = 20;

    await component.save();

    expect(eventMock.createClassroom).not.toHaveBeenCalled();
    expect(eventMock.updateClassroom).not.toHaveBeenCalled();
    expect(component.toastMessage).toBe('El nombre del aula es obligatorio');
  });

  it('should show a toast when capacity is less than or equal to zero', async () => {
    component.name = 'Aula 303';
    component.capacity = 0;

    await component.save();

    expect(eventMock.createClassroom).not.toHaveBeenCalled();
    expect(eventMock.updateClassroom).not.toHaveBeenCalled();
    expect(component.toastMessage).toBe('La capacidad debe ser mayor a 0');
  });

  it('should show a toast when loading the classroom fails', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue('room-1');
    eventMock.getClassrooms.mockRejectedValue(new Error('load error'));

    fixture.detectChanges();
    await vi.waitFor(() => component.toastMessage === 'Error al cargar el aula');

    expect(component.toastMessage).toBe('Error al cargar el aula');
  });
});
