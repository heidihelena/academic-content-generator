import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ACCOUNTS_REPOSITORY,
  POSTS_REPOSITORY,
  TOKEN_STORE,
  TokenStore,
  VECTOR_STORE,
} from './repository.interfaces';
import { maybeEncryptTokenStore } from './encrypted-token-store';
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
import { FileStoreService } from './file/file.service';
import {
  FileAccountsRepository,
  FilePostsRepository,
  FileTokenStore,
  FileVectorStore,
} from './file/file.repositories';

/**
 * Provide TOKEN_STORE as a durable driver's store wrapped in encryption-at-rest
 * when TOKEN_ENCRYPTION_KEY is set (swap-by-config). Registers the concrete
 * store as its own provider so Nest injects its deps, then a factory wraps it.
 */
function encryptedTokenStore(concrete: Type<TokenStore>): Provider[] {
  return [
    concrete,
    {
      provide: TOKEN_STORE,
      inject: [concrete, ConfigService],
      useFactory: (inner: TokenStore, config: ConfigService) =>
        maybeEncryptTokenStore(inner, config.get<string>('security.tokenEncryptionKey')),
    },
  ];
}

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
        ...encryptedTokenStore(SqliteTokenStore),
        { provide: VECTOR_STORE, useClass: SqliteVectorStore },
      ];
    } else if (driver === 'file') {
      providers = [
        FileStoreService,
        { provide: POSTS_REPOSITORY, useClass: FilePostsRepository },
        { provide: ACCOUNTS_REPOSITORY, useClass: FileAccountsRepository },
        ...encryptedTokenStore(FileTokenStore),
        { provide: VECTOR_STORE, useClass: FileVectorStore },
      ];
    } else if (driver === 'neon') {
      providers = [
        PgService,
        { provide: POSTS_REPOSITORY, useClass: PgPostsRepository },
        { provide: ACCOUNTS_REPOSITORY, useClass: PgAccountsRepository },
        ...encryptedTokenStore(PgTokenStore),
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
