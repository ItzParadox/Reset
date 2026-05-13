import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

describe('Reset app integration', () => {
  it('completes onboarding, persists the generated plan, and logs a new weight', async () => {
    const user = userEvent.setup();

    render(<App />);
    expect(screen.getByText('Reset')).toBeInTheDocument();

    await screen.findByRole('button', { name: /start setup/i }, { timeout: 2500 });
    await user.click(screen.getByRole('button', { name: /start setup/i }));
    await user.click(screen.getByRole('button', { name: /metric/i }));
    await user.type(screen.getByLabelText(/display name/i), 'Ada');
    await user.type(screen.getByLabelText(/age/i), '40');
    await user.selectOptions(screen.getByLabelText(/sex/i), 'female');
    await user.type(screen.getByLabelText(/height/i), '170');
    await user.type(screen.getByLabelText(/starting weight/i), '100');
    await user.type(screen.getByLabelText(/goal weight/i), '80');

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /lightly active/i }));
    await user.type(screen.getByLabelText(/comfortable movement target/i), '20');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /start tracking/i }));

    expect(await screen.findByText(/Afternoon, Ada\.|Morning, Ada\.|Evening, Ada\./)).toBeInTheDocument();
    expect(screen.getByText('100.0kg')).toBeInTheDocument();
    expect(screen.getByText('1989')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.profile.onboardingComplete).toBe(true);
    expect(stored.settings.calorieTarget).toBe(1989);
    expect(stored.sync.pending).toEqual([expect.objectContaining({
      mutation: { table: 'onboarding_bundle', action: 'upsert', payloadKey: 'current_user' },
    })]);

    await user.click(screen.getByRole('button', { name: /weight/i }));
    await user.type(screen.getByPlaceholderText(/138\.5/i), '98.5');
    await user.click(within(screen.getByText(/log today's weight/i).closest('.card')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getAllByText('98.5kg')).toHaveLength(2));
    const updated = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(updated.onboardingProfile.currentWeightKg).toBe(98.5);
    expect(updated.weightLogs[0].weightKg).toBe(98.5);
    expect(updated.sync.pending[0].mutation.table).toBe('weight_logs');
  });
});
