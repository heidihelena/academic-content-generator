import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/lib/api';
import { ApiDataSource } from '../src/lib/dataSource';

describe('ApiDataSource.connectAccount', () => {
  it('redirects OAuth platforms to the backend authorize URL', async () => {
    const api = {
      authorizeAccount: vi.fn().mockResolvedValue({
        authorizeUrl: 'https://provider.example/oauth?state=s1',
        state: 's1',
      }),
    } as unknown as ApiClient;
    const redirect = vi.fn();

    const account = await new ApiDataSource(api, redirect).connectAccount('linkedin');

    expect(api.authorizeAccount).toHaveBeenCalledWith('linkedin');
    expect(redirect).toHaveBeenCalledWith('https://provider.example/oauth?state=s1');
    expect(account).toMatchObject({
      platform: 'linkedin',
      status: 'disconnected',
      statusDetail: expect.stringMatching(/Redirecting/),
    });
  });
});
