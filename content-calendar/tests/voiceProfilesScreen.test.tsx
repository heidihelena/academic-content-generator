import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VoiceProfilesScreen } from '../src/components/VoiceProfilesScreen';
import { listVoiceProfiles, resetVoiceProfiles } from '../src/voices/voicesStore';

describe('VoiceProfilesScreen', () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetVoiceProfiles();
  });

  it('lists the seed voices', () => {
    render(<VoiceProfilesScreen />);
    expect(screen.getAllByTestId('voice-profile')).toHaveLength(6);
    expect(screen.getByText('Patient-safe voice')).toBeInTheDocument();
  });

  it('creates a new voice profile', () => {
    render(<VoiceProfilesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /New voice/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grant-report voice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save voice' }));

    expect(screen.getAllByTestId('voice-profile')).toHaveLength(7);
    expect(listVoiceProfiles().some((p) => p.name === 'Grant-report voice')).toBe(true);
  });

  it('deletes a voice profile', () => {
    render(<VoiceProfilesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Short direct voice' }));
    expect(screen.getAllByTestId('voice-profile')).toHaveLength(5);
  });
});
