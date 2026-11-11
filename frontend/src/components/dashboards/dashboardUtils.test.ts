import { describe, expect, it } from 'vitest';
import type { QueryResult, SourceField, Widget } from '../../api/dashboardsApi';
import { adjustLayout, compact, formatValue, kpiValue, placeNew, sanitizeSpec, toChartData } from './dashboardUtils';

function widget(id: string, x: number, y: number, w: number, h: number): Widget {
  return { id, title: id, type: 'bar', spec: { source: 'students', measures: [{ field: 'records', agg: 'count' }] }, layout: { x, y, w, h } };
}

function overlapping(widgets: Widget[]): boolean {
  return widgets.some((a, i) =>
    widgets.some((b, j) => i !== j
      && a.layout.x < b.layout.x + b.layout.w && b.layout.x < a.layout.x + a.layout.w
      && a.layout.y < b.layout.y + b.layout.h && b.layout.y < a.layout.y + a.layout.h));
}

describe('layout', () => {
  it('pushes overlapping widgets down and floats them into gaps', () => {
    const result = compact([widget('a', 0, 0, 6, 4), widget('b', 3, 2, 6, 4), widget('c', 6, 10, 6, 2)]);

    expect(overlapping(result)).toBe(false);
    expect(result.find((w) => w.id === 'a')?.layout.y).toBe(0);
    expect(result.find((w) => w.id === 'b')?.layout.y).toBe(4);
    // c had a gap above it and floats up until it meets b (columns 6–8 overlap).
    expect(result.find((w) => w.id === 'c')?.layout.y).toBe(8);
  });

  it('keeps the moved widget in place and moves others out of its way', () => {
    const start = [widget('a', 0, 0, 6, 4), widget('b', 6, 0, 6, 4)];
    const moved = adjustLayout(start, 'b', 'left');

    expect(moved.find((w) => w.id === 'b')?.layout).toMatchObject({ x: 5, y: 0 });
    expect(overlapping(moved)).toBe(false);
  });

  it('clamps sizes to the grid', () => {
    const wide = adjustLayout([widget('a', 0, 0, 12, 4)], 'a', 'wider');
    expect(wide[0].layout).toMatchObject({ x: 0, w: 12 });

    const narrow = adjustLayout([widget('a', 0, 0, 1, 1)], 'a', 'narrower');
    expect(narrow[0].layout).toMatchObject({ w: 1, h: 1 });
  });

  it('places new widgets in the first free spot', () => {
    expect(placeNew([widget('a', 0, 0, 6, 4)], { w: 6, h: 4 })).toEqual({ x: 6, y: 0, w: 6, h: 4 });
    expect(placeNew([widget('a', 0, 0, 12, 4)], { w: 3, h: 2 })).toEqual({ x: 0, y: 4, w: 3, h: 2 });
  });
});

describe('chart data', () => {
  const base = { truncated: false, scope: { level: 'institution', label: '' } } as const;

  it('maps one dimension to categories and measures to series', () => {
    const data = toChartData({
      ...base,
      columns: [
        { key: 'd0', role: 'dimension', field: 'subject', label: 'Subject', type: 'string' },
        { key: 'm0', role: 'measure', field: 'pass_pct', label: 'Pass %', type: 'number' },
      ],
      rows: [{ d0: 'Maths', m0: 80 }, { d0: null, m0: 50 }],
    });

    expect(data.series).toEqual([{ key: 'm0', label: 'Pass %' }]);
    expect(data.points).toEqual([{ category: 'Maths', m0: 80 }, { category: 'Not set', m0: 50 }]);
  });

  it('pivots a second dimension into series', () => {
    const data = toChartData({
      ...base,
      columns: [
        { key: 'd0', role: 'dimension', field: 'entered_by', label: 'Entered by', type: 'string' },
        { key: 'd1', role: 'dimension', field: 'status', label: 'Status', type: 'string' },
        { key: 'm0', role: 'measure', field: 'records', label: 'Entries', type: 'number' },
      ],
      rows: [
        { d0: 'Rao', d1: 'draft', m0: 3 },
        { d0: 'Rao', d1: 'locked', m0: 7 },
        { d0: 'Iyer', d1: 'locked', m0: 2 },
      ],
    });

    expect(data.series.map((s) => s.label)).toEqual(['draft', 'locked']);
    expect(data.points).toEqual([
      { category: 'Rao', s_draft: 3, s_locked: 7 },
      { category: 'Iyer', s_locked: 2 },
    ]);
  });

  it('reads KPI values and formats them', () => {
    const result: QueryResult = { ...base, columns: [{ key: 'm0', role: 'measure', field: 'cgpa', label: 'CGPA', type: 'number' }], rows: [{ m0: 7.456 }] };

    expect(kpiValue(result)).toBe(7.456);
    expect(formatValue(7.456, 'decimal')).toBe('7.46');
    expect(formatValue(82.25, 'percent')).toBe('82.3%');
    expect(formatValue(null)).toBe('—');
  });
});

describe('sanitizeSpec', () => {
  const fields: SourceField[] = [
    { key: 'records', label: 'Number of records', type: 'number', dimension: false, aggregations: ['count'], options: [], group: null, custom: false },
    { key: 'subject', label: 'Subject', type: 'string', dimension: true, aggregations: [], options: [], group: null, custom: false },
    { key: 'exam_date', label: 'Exam date', type: 'date', dimension: true, aggregations: [], options: [], group: null, custom: false },
    { key: 'total_marks', label: 'Total', type: 'number', dimension: true, aggregations: ['avg'], options: [], group: null, custom: false },
  ];

  it('drops fields the source does not have and limits pies and KPIs', () => {
    const spec = sanitizeSpec({
      source: 'marks',
      measures: [{ field: 'total_marks', agg: 'avg' }, { field: 'cgpa', agg: 'avg' }, { field: 'records', agg: 'count' }],
      dimensions: [{ field: 'subject', grain: 'month' }, { field: 'exam_date', grain: 'month' }, { field: 'unknown' }],
      sort: { by: 'm2', dir: 'desc' },
    }, 'pie', fields);

    expect(spec.measures).toEqual([{ field: 'total_marks', agg: 'avg' }]);
    expect(spec.dimensions).toEqual([{ field: 'subject' }]);
    expect(spec.sort).toBeNull();

    expect(sanitizeSpec({ source: 'marks', measures: [{ field: 'nope', agg: 'sum' }], dimensions: [{ field: 'subject' }] }, 'kpi', fields))
      .toMatchObject({ measures: [{ field: 'records', agg: 'count' }], dimensions: [] });
  });
});
