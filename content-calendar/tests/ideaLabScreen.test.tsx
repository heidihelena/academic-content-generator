import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IdeaLabScreen } from '../src/components/IdeaLabScreen';
import { LocalIdeaLabClient, setIdeaLabClient } from '../src/idea-lab/ideaLabClient';
import { LocalSourcesClient, setSourcesClient } from '../src/sources/sourcesClient';
import type { StudioSeed } from '../src/studio/studioTypes';

describe('IdeaLabScreen', () => {
  beforeEach(() => {
    vi.useRealTimers();
    setSourcesClient(new LocalSourcesClient());
    setIdeaLabClient(new LocalIdeaLabClient());
  });

  it('generates graded ideas from a selected source, plus the patient-safe explainer', async () => {
    render(<IdeaLabScreen onDraft={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /Street trees and urban heat equity/ }));
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 ideas/ }));

    const cards = await screen.findAllByTestId('idea-card');
    expect(cards).toHaveLength(6); // 5 generated + the always-on patient-safe explainer
    expect(screen.getByText('Patient-safe explainer')).toBeInTheDocument();
    // The explainer targets patients, so it always carries the safety-review flag.
    expect(screen.getAllByText('safety review').length).toBeGreaterThan(0);
  });

  it('hands the idea off to the Draft Studio with channel, audience and hook', async () => {
    const seeds: StudioSeed[] = [];
    render(<IdeaLabScreen onDraft={(seed) => seeds.push(seed)} />);

    fireEvent.click(await screen.findByRole('button', { name: /Sleep and memory consolidation/ }));
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 ideas/ }));
    const drafts = await screen.findAllByRole('button', { name: 'Draft this →' });
    fireEvent.click(drafts[drafts.length - 1]); // the explainer

    expect(seeds).toHaveLength(1);
    expect(seeds[0].channel).toBe('explainer');
    expect(seeds[0].audience).toBe('patients');
    expect(seeds[0].sourceId).toBe('src_sample_sleep');
    expect(seeds[0].hook).toBeTruthy();
  });
});
