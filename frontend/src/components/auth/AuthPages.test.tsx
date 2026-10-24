import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordPage, RegisterPage } from './AuthPages';
import { mockFetch } from '../../test/mockFetch';

describe('ForgotPasswordPage', () => {
  it('shows the server confirmation after sending', async () => {
    const fetchMock = mockFetch(200, { message: 'If an account exists for this email, we have sent a link to reset the password.' });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Email address'), 'staff@demo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/forgot-password');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'staff@demo.com' });
  });
});

describe('RegisterPage', () => {
  it('shows validation errors next to the fields', async () => {
    mockFetch(422, {
      message: 'The given data was invalid.',
      errors: { institutionCode: ['No active institution uses this code. Check the code your institution gave you.'] },
    });
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText('Institution code'), 'NOPE');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    const field = screen.getByLabelText('Institution code');
    expect(await screen.findByText(/No active institution uses this code/)).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });
});
