import { TestBed } from '@angular/core/testing';
import { RealtimeService, type RealtimeChange } from './realtime.service';
import { SupabaseService } from './supabase.service';
import { createSupabaseServiceMock } from '../../../testing/mock-factories';
import { firstValueFrom } from 'rxjs';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let supabaseMock: ReturnType<typeof createSupabaseServiceMock>;
  let mockChannel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    topic: string;
  };

  beforeEach(() => {
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      topic: 'realtime:announcements',
    };

    supabaseMock = createSupabaseServiceMock();
    vi.mocked(supabaseMock.client.channel).mockReturnValue(
      mockChannel as unknown as ReturnType<SupabaseService['client']['channel']>,
    );

    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });
    service = TestBed.inject(RealtimeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('subscribe', () => {
    it('should create a channel and subscribe', () => {
      service.subscribe('announcements');
      expect(supabaseMock.client.channel).toHaveBeenCalledWith('announcements');
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should not create duplicate channels for the same table', () => {
      service.subscribe('announcements');
      service.subscribe('announcements');
      expect(supabaseMock.client.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('onChanges', () => {
    it('should emit changes when the channel callback fires', async () => {
      service.subscribe('announcements');
      const promise = firstValueFrom(service.onChanges('announcements'));

      const callback = mockChannel.on.mock.calls[0][2];
      callback({
        eventType: 'INSERT',
        new: { id: '1', title: 'Hello' },
        old: {},
      });

      const change = (await promise) as RealtimeChange<{ id: string; title: string }>;
      expect(change.eventType).toBe('INSERT');
      expect(change.table).toBe('announcements');
      expect(change.new.id).toBe('1');
    });
  });

  describe('unsubscribe', () => {
    it('should remove the channel and complete the subject', () => {
      service.subscribe('announcements');
      service.unsubscribe('announcements');
      expect(supabaseMock.client.removeChannel).toHaveBeenCalled();
    });
  });

  describe('disconnectAll', () => {
    it('should remove all channels and clear subjects', () => {
      service.subscribe('announcements');
      service.subscribe('events');
      service.disconnectAll();
      expect(supabaseMock.client.removeChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe('ngOnDestroy', () => {
    it('should disconnect all channels and close broadcast channel', () => {
      service.subscribe('announcements');
      service.ngOnDestroy();
      expect(supabaseMock.client.removeChannel).toHaveBeenCalled();
    });
  });
});
