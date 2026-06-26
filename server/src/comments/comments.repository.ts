import { CollectionStore } from '../persistence/json-file.store';
import { Comment } from '../domain/academic';

/**
 * Store for {@link Comment} entries. Swappable backing store: in-memory
 * (default), or a durable CollectionStore (JSON file or SQLite) on a non-`memory`
 * driver — the same pattern as the other repositories.
 */
export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY');

const byOldest = (a: Comment, b: Comment) => a.createdAt.localeCompare(b.createdAt);

export interface CommentsRepository {
  listByItem(itemId: string): Promise<Comment[]>;
  upsert(comment: Comment): Promise<Comment>;
}

export class InMemoryCommentsRepository implements CommentsRepository {
  private readonly byId = new Map<string, Comment>();
  async listByItem(itemId: string) {
    return [...this.byId.values()].filter((c) => c.itemId === itemId).sort(byOldest);
  }
  async upsert(comment: Comment) {
    this.byId.set(comment.id, comment);
    return comment;
  }
}

export class StoreBackedCommentsRepository implements CommentsRepository {
  constructor(private readonly store: CollectionStore<Comment>) {}
  async listByItem(itemId: string) {
    return this.store
      .list()
      .filter((c) => c.itemId === itemId)
      .sort(byOldest);
  }
  async upsert(comment: Comment) {
    return this.store.upsert(comment);
  }
}
