import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConnectedAccount, Platform } from '../domain/types';
import {
  ACCOUNTS_REPOSITORY,
  TOKEN_STORE,
  type AccountsRepository,
  type TokenStore,
} from '../persistence/repository.interfaces';
import { IntegrationRegistry } from '../integrations/integration.registry';
import type { ConnectParams } from '../integrations/integration.types';

const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'threads'];

@Injectable()
export class AccountsService implements OnModuleInit {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepository,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
    private readonly integrations: IntegrationRegistry,
  ) {}

  /** Seed a disconnected row per platform so the UI always has something to show. */
  async onModuleInit(): Promise<void> {
    for (const platform of PLATFORMS) {
      if (!(await this.accounts.findByPlatform(platform))) {
        await this.accounts.upsert({ platform, status: 'disconnected' });
      }
    }
  }

  list(): Promise<ConnectedAccount[]> {
    return this.accounts.list();
  }

  /**
   * Connects an account. In the real OAuth flow `code` + `redirectUri` arrive at
   * the callback endpoint; the mock ignores them. Tokens are persisted in the
   * TokenStore — never in the vault or returned to the client.
   */
  async connect(platform: Platform, params?: ConnectParams): Promise<ConnectedAccount> {
    try {
      const { account, token } = await this.integrations.get(platform).connect(params);
      await this.tokens.set(token);
      return this.accounts.upsert(account);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Connection failed';
      return this.accounts.upsert({ platform, status: 'error', statusDetail: detail });
    }
  }

  async disconnect(platform: Platform): Promise<ConnectedAccount> {
    const token = await this.tokens.get(platform);
    if (token) await this.integrations.get(platform).disconnect(token);
    await this.tokens.delete(platform);
    return this.accounts.upsert({ platform, status: 'disconnected' });
  }
}
