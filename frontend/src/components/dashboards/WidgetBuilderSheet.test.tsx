import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DataSource, Widget } from '../../api/dashboardsApi';
import { mockFetch, signInAs } from '../../test/mockFetch';
import { WidgetBuilderSheet } from './WidgetBuilderSheet';

const sources: DataSource[] = [
  {
    key: 'attendance',
    label: 'Attendance',
    description: 'One row per session.',
    fields: [
      { key: 'records', label: 'Number of records', type: 'number', dimension: false, aggregations: ['count'], options: [], group: null, custom: false },
      { key: 'present_pct', label: 'Present %', type: 'number', dimension: false, aggregations: ['avg'], options: [], group: null, custom: false },
      { key: 'subject', label: 'Subject', type: 'string', dimension: true, aggregations: [], options: [], group: null, custom: false },
      { key: 'status', label: 'Status', type: 'string', dimension: true, aggregations: [], options: ['present', 'absent'], group: null, custom: false },
      { key: 'date', label: 'Date', type: 'date', dimension: true, aggregations: [], options: [], group: null, custom: false },
      { key: 'cf.student.hostel', label: 'Hostel (Student)', type: 'string', dimension: true, aggregations: ['count_distinct'], options: ['Yes', 'No'], group: 'Custom fields', custom: true },
    ],
  },
];

const widget: Widget = {
  id: 'w1',
  title: 'New widget',
  type: 'bar',
  spec: { source: 'attendance', measures: [{ field: 'records', agg: 'count' }], dimensions: [{ field: 'subject' }], filters: [], having: [] },
  layout: { x: 0, y: 0, w: 6, h: 4 },
  options: {},
};

function renderBuilder(onSave = vi.fn()) {
  signInAs();
  mockFetch(200, {
    data: {
      columns: [
        { key: 'd0', role: 'dimension', field: 'subject', label: 'Subject', type: 'string' },
        { key: 'm0', role: 'measure', field: 'records', label: 'Number of records', type: 'number' },
      ],
      rows: [{ d0: 'Maths', m0: 12 }],
      truncated: false,
      scope: { level: 'subjects', label: 'Your allocated subjects' },
    },
  });

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WidgetBuilderSheet open onOpenChange={() => undefined} sources={sources} widget={widget} onSave={onSave} />
    </QueryClientProvider>,
  );

  return onSave;
}

describe('WidgetBuilderSheet', () => {
  it('builds a spec from the choices and offers custom fields', async () => {
    const onSave = renderBuilder();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Widget title'));
    await user.type(screen.getByLabelText('Widget title'), 'Low attendance by hostel');

    await user.selectOptions(screen.getByLabelText('Value 1 field'), 'present_pct');
    expect(screen.getByLabelText('Value 1 calculation')).toHaveValue('avg');

    // Custom fields are listed in their own group.
    const groupSelect = screen.getByLabelText('Group 1');
    expect(within(groupSelect).getByRole('group', { name: 'Custom fields' })).toBeInTheDocument();
    await user.selectOptions(groupSelect, 'cf.student.hostel');

    await user.click(screen.getByRole('button', { name: /Add filter/ }));
    await user.selectOptions(screen.getByLabelText('Filter 1 field'), 'status');
    await user.selectOptions(screen.getByLabelText('Filter 1 value'), 'absent');

    await user.click(screen.getByRole('button', { name: /Add condition/ }));
    await user.clear(screen.getByLabelText('Condition 1 amount'));
    await user.type(screen.getByLabelText('Condition 1 amount'), '60');

    await user.click(screen.getByRole('button', { name: 'Save widget' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Low attendance by hostel',
      spec: expect.objectContaining({
        measures: [{ field: 'present_pct', agg: 'avg' }],
        dimensions: [{ field: 'cf.student.hostel' }],
        filters: [{ field: 'status', op: '=', value: 'absent' }],
        having: [{ measure: 0, op: '<', value: 60 }],
      }),
    }));
  });

  it('switching to a number tile drops groupings and extra values', async () => {
    const onSave = renderBuilder();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Add value/ }));
    await user.click(screen.getByRole('button', { name: 'Number' }));

    expect(screen.queryByLabelText('Group 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Value 2 field')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save widget' }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ type: 'kpi', layout: { w: 3, h: 2 }, spec: { dimensions: [], measures: [{ field: 'records', agg: 'count' }] } });
  });

  it('previews the widget with the viewer’s data', async () => {
    renderBuilder();
    // Charts need a measured container, which jsdom lacks; a table shows the rows directly.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Table' }));

    expect(await screen.findByText('Maths')).toBeInTheDocument();
    const [url, init] = vi.mocked(fetch).mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/dashboards/query');
    expect(JSON.parse(String(init.body)).spec).toMatchObject({ source: 'attendance', dimensions: [{ field: 'subject' }] });
  });
});
