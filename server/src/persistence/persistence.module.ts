import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ACCOUNTS_REPOSITORY,
  POSTS_REPOSITORY,
  TOKEN_STORE,
  VECTOR_STORE,
} from './repository.interfaces';
import {
  MemoryAccountsRepository,
  MemoryPostsRepository,
  MemoryTokenStore,
  MemoryVectorStore,
} from './memory/memory.repositories';
import { SqliteService } from './sqlite/sqlite.service';
import {
  SqliteAccountsRepository,
  SqlitePostsRepository,
  SqliteTokenStore,
  SqliteVectorStore,
} from './sqlite/sqlite.repositories';
import { PgService } from './pg/pg.service';
import {
  PgAccountsRepository,
  PgPostsRepository,
  PgTokenStore,
  PgVectorStore,
} from './pg/pg.repositories';

/**
 * Wires the repository interfaces to a concrete driver chosen by
 * PERSISTENCE_DRIVER. Only the selected driver's connection service is
 * registered, so the SQLite/Postgres modules never load unless requested.
 */
@Module({})
export class PersistenceModule {
  static forRoot(): DynamicModule {
    const driver = process.env.PERSISTENCE_DRIVER ?? 'memory';
    let providers: Provider[];

    if (driver === 'sqlite') {
      providers = [
        SqliteService,
        { provide: POSTS_REPOSITORY, useClass: SqlitePostsRepository },
        { provide: ACCOUNTS_REPOSITORY, useClass: SqliteAccountsRepository },
        { provide: TOKEN_STORE, useClass: SqliteTokenStore },
        { provide: VECTOR_STORE, useClass: SqliteVectorStore },
      ];
    } else if (driver === 'neon') {
      providers = [
        PgService,
        { provide: POSTS_REPOSITORY, useClass: PgPostsRepository },
        { provide: ACCOUNTS_REPOSITORY, useClass: PgAccountsRepository },
        { provide: TOKEN_STORE, useClass: PgTokenStore },
        { provide: VECTOR_STORE, useClass: PgVectorStore },
      ];
    } else {
      providers = [
        { provide: POSTS_REPOSITORY, useClass: MemoryPostsRepository },
        { provide: ACCOUNTS_REPOSITORY, useClass: MemoryAccountsRepository },
        { provide: TOKEN_STORE, useClass: MemoryTokenStore },
        { provide: VECTOR_STORE, useClass: MemoryVectorStore },
      ];
    }

    return {
      module: PersistenceModule,
      global: true,
      imports: [ConfigModule],
      providers,
      exports: [POSTS_REPOSITORY, ACCOUNTS_REPOSITORY, TOKEN_STORE, VECTOR_STORE],
    };
  }
}
