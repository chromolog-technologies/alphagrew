import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA_EVENT } from '../../api/core';
import { SampleDataNotice } from './SampleDataNotice';

const flagSample = () => act(() => void window.dispatchEvent(new CustomEvent(SAMPLE_DATA_EVENT, { detail: { path: '/x' } })));

describe('SampleDataNotice', () => {
  it('appears after a sample-data response and clears on the next screen', () => {
    const { rerender } = render(<SampleDataNotice screenKey="exam_coordinator" />);
    expect(screen.queryByText('Prototype screen')).toBeNull();

    flagSample();
    expect(screen.getByText('Prototype screen')).toBeInTheDocument();

    rerender(<SampleDataNotice screenKey="placements" />);
    expect(screen.queryByText('Prototype screen')).toBeNull();
  });
});
