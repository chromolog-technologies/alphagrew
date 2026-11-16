import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { http } from '../../api/http';
import { NotificationCenter } from './NotificationCenter';

const state = vi.hoisted(() => ({ smsAvailable: true, smsPhone: '+919876543210' as string | null }));

vi.mock('../../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/http')>()),
  http: {
    get: vi.fn((path: string) =>
      Promise.resolve(
        path === '/notifications/preferences'
          ? {
              data: [{ category: 'academics', label: 'Academics', description: 'Marks', inApp: true, mail: false, sms: false }],
              meta: { smsAvailable: state.smsAvailable, smsPhone: state.smsPhone },
            }
          : { data: [], meta: { currentPage: 1, lastPage: 1, total: 0, unreadCount: 0 } },
      ),
    ),
    put: vi.fn(() => Promise.resolve({ data: [], meta: { smsAvailable: true, smsPhone: '+919876543210' } })),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const open = async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NotificationCenter onNavigate={() => {}} />
    </QueryClientProvider>,
  );
  await user.click(screen.getByRole('button', { name: /Preferences/ }));
  return user;
};

describe('Notification preferences', () => {
  it('lets the user opt in to SMS when the platform sends texts', async () => {
    state.smsAvailable = true;
    state.smsPhone = '+919876543210';
    const user = await open();

    expect(await screen.findByText(/Texts go to \+919876543210/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Academics by SMS'));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));

    await vi.waitFor(() =>
      expect(http.put).toHaveBeenCalledWith('/notifications/preferences', {
        preferences: [expect.objectContaining({ category: 'academics', inApp: true, mail: false, sms: true })],
      }),
    );
  });

  it('hides SMS when no provider is configured', async () => {
    state.smsAvailable = false;
    state.smsPhone = null;
    await open();

    expect(await screen.findByLabelText('Academics by email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Academics by SMS')).not.toBeInTheDocument();
  });
});
