import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../src/components/ConnectionStatus';
import type { ConnectionStatus as Status } from '../src/lib/connection';

const checkConnection = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/connection', () => ({ checkConnection }));

// Real timers so the effect's promise resolves under findBy*.
beforeEach(() => vi.useRealTimers());

function resolveWith(status: Status) {
  checkConnection.mockResolvedValue(status);
}

describe('ConnectionStatus', () => {
  it('shows "Local" in local mode', async () => {
    resolveWith({ mode: 'local', online: true });
    render(<ConnectionStatus />);
    expect(await screen.findByText('Local')).toBeInTheDocument();
  });

  it('shows "API · connected" with the backend modes in the tooltip', async () => {
    resolveWith({
      mode: 'api',
      online: true,
      baseUrl: 'http://localhost:3000/api',
      backend: {
        persistence: 'neon',
        aiGenerator: 'llm',
        aiProvider: 'ollama',
        embeddings: 'mock',
        storage: 'local',
      },
    });
    render(<ConnectionStatus />);
    const badge = await screen.findByText('API · connected');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', expect.stringContaining('persistence: neon'));
    expect(badge).toHaveAttribute('title', expect.stringContaining('(ollama)'));
  });

  it('shows "API · offline" when the backend is unreachable', async () => {
    resolveWith({ mode: 'api', online: false, baseUrl: 'http://localhost:3000/api' });
    render(<ConnectionStatus />);
    expect(await screen.findByText('API · offline')).toBeInTheDocument();
  });
});
