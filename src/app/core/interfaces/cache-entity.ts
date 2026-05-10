/** Entity types that can be cached locally */
export type CacheEntityType =
  | 'announcements'
  | 'notices'
  | 'surveys'
  | 'events'
  | 'faq_entries';

/** Metadata for a cached entity set */
export interface CacheMeta {
  entityType: CacheEntityType;
  lastSyncAt: string; // ISO 8601
  recordCount: number;
}

/** A generic cached record stored locally */
export interface CachedRecord<T = Record<string, unknown>> {
  id: string;
  data: T;
  cachedAt: string; // ISO 8601
}

/** Operation queued for later sync when connectivity is restored */
export type OfflineOperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OfflineOperation {
  id: string;
  operation: OfflineOperationType;
  entityType: CacheEntityType;
  payload: Record<string, unknown>;
  createdAt: string; // ISO 8601
  retryCount: number;
}
