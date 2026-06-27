import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SqliteJsonStore } from './sqlite-json.store';

interface Row {
  id: string;
  name: string;
}

// better-sqlite3 is an optional native dependency; skip the suite gracefully if
// it isn't installed rather than failing the build.
let available = true;
try {
  require('better-sqlite3');
} catch {
  available = false;
}

const describeIf = available ? describe : describe.skip;

describeIf('SqliteJsonStore', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sqlite-json-'));
    dbPath = join(dir, 'test.sqlite');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('upserts, gets, lists and deletes', () => {
    const store = new SqliteJsonStore<Row>(dbPath, 'rows');
    expect(store.list()).toEqual([]);
    expect(store.get('a')).toBeUndefined();

    store.upsert({ id: 'a', name: 'Alice' });
    store.upsert({ id: 'b', name: 'Bob' });
    expect(store.get('a')).toEqual({ id: 'a', name: 'Alice' });
    expect(store.list()).toHaveLength(2);

    // upsert on an existing id updates in place (no duplicate row).
    store.upsert({ id: 'a', name: 'Alice 2' });
    expect(store.get('a')).toEqual({ id: 'a', name: 'Alice 2' });
    expect(store.list()).toHaveLength(2);

    store.delete('a');
    expect(store.get('a')).toBeUndefined();
    expect(store.list()).toHaveLength(1);
  });

  it('persists across reopen (durability) and isolates tables in one db', () => {
    const items = new SqliteJsonStore<Row>(dbPath, 'items');
    const slots = new SqliteJsonStore<Row>(dbPath, 'slots');
    items.upsert({ id: 'x', name: 'item' });
    slots.upsert({ id: 'x', name: 'slot' });

    // Same id, different tables — no collision.
    expect(items.get('x')).toEqual({ id: 'x', name: 'item' });
    expect(slots.get('x')).toEqual({ id: 'x', name: 'slot' });

    // A fresh store object over the same file + table sees the persisted data.
    const reopened = new SqliteJsonStore<Row>(dbPath, 'items');
    expect(reopened.get('x')).toEqual({ id: 'x', name: 'item' });
  });

  it('rejects an unsafe table name', () => {
    expect(() => new SqliteJsonStore<Row>(dbPath, 'rows; DROP TABLE rows')).toThrow(
      /Invalid SQLite table name/,
    );
  });
});
