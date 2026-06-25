import { CollectionStore } from '../persistence/json-file.store';
import { LearnedSlot } from './timing.types';

/**
 * Store for learned timing scores. Swappable backing store: in-memory (default),
 * or a durable {@link CollectionStore} (JSON file or SQLite) when a non-`memory`
 * persistence driver is configured — the same pattern as the other repositories.
 */
export const TIMING_REPOSITORY = Symbol('TIMING_REPOSITORY');

export interface TimingRepository {
  list(): Promise<LearnedSlot[]>;
  findById(id: string): Promise<LearnedSlot | null>;
  upsert(slot: LearnedSlot): Promise<LearnedSlot>;
}

export class InMemoryTimingRepository implements TimingRepository {
  private readonly byId = new Map<string, LearnedSlot>();
  async list() {
    return [...this.byId.values()];
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async upsert(slot: LearnedSlot) {
    this.byId.set(slot.id, slot);
    return slot;
  }
}

export class StoreBackedTimingRepository implements TimingRepository {
  constructor(private readonly store: CollectionStore<LearnedSlot>) {}
  async list() {
    return this.store.list();
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async upsert(slot: LearnedSlot) {
    return this.store.upsert(slot);
  }
}
