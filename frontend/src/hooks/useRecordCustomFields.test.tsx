import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/apiError';
import { useCustomFieldValues } from '../api/customFieldsApi';
import { useRecordCustomFields } from './useRecordCustomFields';

vi.mock('../api/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/http')>()),
  isApiConfigured: () => true,
}));

// Stable results, like react-query returns them (a new object per render would re-run the
// hook's effect forever). Implementations, not mockReturnValue: test/setup.ts restores mocks.
const mocks = vi.hoisted(() => ({
  definitions: {
    data: [
      { id: 1, entity: 'course', key: 'ref_code', label: 'Ref code', type: 'text', options: [], helpText: null, isRequired: true, isActive: true, sortOrder: 0 },
      { id: 2, entity: 'course', key: 'seats', label: 'Seats', type: 'number', options: [], helpText: null, isRequired: false, isActive: true, sortOrder: 1 },
      { id: 3, entity: 'course', key: 'nba', label: 'NBA', type: 'boolean', options: [], helpText: null, isRequired: false, isActive: true, sortOrder: 2 },
    ],
    isLoading: false,
  },
  stored: { data: { ref_code: 'ABC', seats: 60, nba: true }, isLoading: false },
  none: { data: undefined, isLoading: false },
}));

vi.mock('../api/customFieldsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/customFieldsApi')>();
  return {
    ...actual,
    useCustomFieldDefinitions: vi.fn(() => mocks.definitions),
    useCustomFieldValues: vi.fn((_entity: string, id: number | null | undefined) => (id ? mocks.stored : mocks.none)),
  };
});

describe('useRecordCustomFields', () => {
  it('starts a new record empty and sends every field', () => {
    const { result } = renderHook(() => useRecordCustomFields('course', null, true));

    expect(result.current.values).toEqual({});
    // Blank fields go as null (or "No"), so the server reports required fields left empty.
    expect(result.current.payload()).toEqual({ customFields: { ref_code: null, seats: null, nba: false } });

    act(() => result.current.setValues({ ref_code: 'XY-1', seats: '40' }));
    expect(result.current.payload()).toEqual({ customFields: { ref_code: 'XY-1', seats: 40, nba: false } });
  });

  it('loads the stored values when editing', () => {
    const { result } = renderHook(() => useRecordCustomFields('course', 7, true));

    expect(vi.mocked(useCustomFieldValues)).toHaveBeenLastCalledWith('course', 7);
    expect(result.current.values).toEqual({ ref_code: 'ABC', seats: 60, nba: true });
    expect(result.current.payload()).toEqual({ customFields: { ref_code: 'ABC', seats: 60, nba: true } });
  });

  it('does not load values while the form is closed', () => {
    renderHook(() => useRecordCustomFields('course', 7, false));
    expect(vi.mocked(useCustomFieldValues)).toHaveBeenLastCalledWith('course', null);
  });

  it('keeps only custom field errors from a failed save', () => {
    const { result } = renderHook(() => useRecordCustomFields('course', null, true));
    const error = new ApiError('Invalid', 422, { name: ['Name is required.'], 'customFields.ref_code': ['The Ref code field is required.'] });

    let captured = false;
    act(() => {
      captured = result.current.captureErrors(error);
    });
    expect(captured).toBe(true);
    expect(result.current.errors).toEqual({ 'customFields.ref_code': 'The Ref code field is required.' });

    act(() => {
      captured = result.current.captureErrors(new Error('Network down'));
    });
    expect(captured).toBe(false);
    expect(result.current.errors).toEqual({});
  });
});
