/**
 * Pure helpers for dashboards: grid layout, value formatting, and turning query results
 * into chart series. Kept free of React so they can be unit-tested.
 */
import type {
  Aggregation,
  QueryResult,
  ResultRow,
  SourceField,
  ValueFormat,
  Widget,
  WidgetLayout,
  WidgetSpec,
  WidgetType,
} from '../../api/dashboardsApi';

export const GRID_COLUMNS = 12;

// ---------------------------------------------------------------------------------------
// Layout: a 12-column grid. Widgets never overlap: after any change, widgets are pushed
// down until they fit and then floated up as far as they can go (vertical compaction).
// ---------------------------------------------------------------------------------------

function overlaps(a: WidgetLayout, b: WidgetLayout): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function clampLayout(layout: WidgetLayout): WidgetLayout {
  const w = Math.max(1, Math.min(GRID_COLUMNS, Math.round(layout.w)));
  return {
    w,
    h: Math.max(1, Math.min(12, Math.round(layout.h))),
    x: Math.max(0, Math.min(GRID_COLUMNS - w, Math.round(layout.x))),
    y: Math.max(0, Math.round(layout.y)),
  };
}

/**
 * Resolves overlaps and removes gaps. `priorityId` keeps its position when it collides
 * (the widget the user just moved or resized); everything else makes room.
 */
export function compact(widgets: Widget[], priorityId?: string): Widget[] {
  const ordered = widgets
    .map((widget) => ({ ...widget, layout: clampLayout(widget.layout) }))
    .sort((a, b) => {
      if (a.id === priorityId) return -1;
      if (b.id === priorityId) return 1;
      return a.layout.y - b.layout.y || a.layout.x - b.layout.x;
    });

  const placed: Widget[] = [];
  for (const widget of ordered) {
    const layout = { ...widget.layout };
    // Float up as far as possible...
    while (layout.y > 0 && !placed.some((other) => overlaps({ ...layout, y: layout.y - 1 }, other.layout))) {
      layout.y -= 1;
    }
    // ...then down until nothing overlaps.
    while (placed.some((other) => overlaps(layout, other.layout))) {
      layout.y += 1;
    }
    placed.push({ ...widget, layout });
  }

  // A second pass lets widgets above the priority widget float into freed space.
  return placed
    .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x)
    .reduce<Widget[]>((settled, widget) => {
      const layout = { ...widget.layout };
      while (layout.y > 0 && !settled.some((other) => overlaps({ ...layout, y: layout.y - 1 }, other.layout))) {
        layout.y -= 1;
      }
      while (settled.some((other) => overlaps(layout, other.layout))) {
        layout.y += 1;
      }
      settled.push({ ...widget, layout });
      return settled;
    }, []);
}

/** Size a new widget of each type starts with. */
export function defaultSize(type: WidgetType): Pick<WidgetLayout, 'w' | 'h'> {
  switch (type) {
    case 'kpi':
      return { w: 3, h: 2 };
    case 'table':
    case 'list':
      return { w: 6, h: 5 };
    default:
      return { w: 6, h: 4 };
  }
}

/** First free spot, scanning rows top to bottom and columns left to right. */
export function placeNew(widgets: Widget[], size: Pick<WidgetLayout, 'w' | 'h'>): WidgetLayout {
  const bottom = widgets.reduce((max, widget) => Math.max(max, widget.layout.y + widget.layout.h), 0);

  for (let y = 0; y <= bottom; y += 1) {
    for (let x = 0; x + size.w <= GRID_COLUMNS; x += 1) {
      const candidate = { x, y, ...size };
      if (!widgets.some((widget) => overlaps(candidate, widget.layout))) {
        return candidate;
      }
    }
  }

  return { x: 0, y: bottom, ...size };
}

export type LayoutAction = 'left' | 'right' | 'up' | 'down' | 'wider' | 'narrower' | 'taller' | 'shorter';

/** Moves or resizes one widget by one step, then re-compacts. */
export function adjustLayout(widgets: Widget[], id: string, action: LayoutAction): Widget[] {
  const target = widgets.find((widget) => widget.id === id);
  if (!target) return widgets;

  const { x, y, w, h } = target.layout;
  const next: WidgetLayout = {
    left: { x: x - 1, y, w, h },
    right: { x: x + 1, y, w, h },
    // Moving up jumps above the widget overhead; moving down jumps below the one underneath.
    up: { x, y: Math.max(0, y - 1), w, h },
    down: { x, y: y + h, w, h },
    wider: { x: x + w >= GRID_COLUMNS ? x - 1 : x, y, w: w + 1, h },
    narrower: { x, y, w: w - 1, h },
    taller: { x, y, w, h: h + 1 },
    shorter: { x, y, w, h: h - 1 },
  }[action];

  if (action === 'up') {
    const above = widgets
      .filter((widget) => widget.id !== id && widget.layout.y + widget.layout.h <= y && overlaps({ ...target.layout, y: 0, h: y }, widget.layout))
      .sort((a, b) => b.layout.y - a.layout.y)[0];
    next.y = above ? above.layout.y : 0;
  }

  return compact(widgets.map((widget) => (widget.id === id ? { ...widget, layout: next } : widget)), id);
}

// ---------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------

export function formatValue(value: unknown, format: ValueFormat = 'number'): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'number') return String(value);

  if (format === 'percent') return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  if (format === 'decimal') return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return value.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(value) ? 0 : 2 });
}

/** Display text for a dimension value; empty groups read as "Not set". */
export function dimensionLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replace(/_/g, ' ');
}

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  count: 'Count',
  count_distinct: 'Count distinct',
  sum: 'Total',
  avg: 'Average',
  min: 'Lowest',
  max: 'Highest',
};

// ---------------------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------------------

export interface ChartSeries {
  key: string;
  label: string;
}

export interface ChartData {
  /** One entry per category (first dimension); `category` holds its label. */
  points: Array<Record<string, string | number | null>>;
  series: ChartSeries[];
}

/**
 * Shapes a result for bar, line and pie charts.
 * - No dimension: one category per measure.
 * - One dimension: categories from it, one series per measure.
 * - Two dimensions: categories from the first, one series per value of the second
 *   (first measure only), e.g. faculty × mark status.
 */
export function toChartData(result: QueryResult): ChartData {
  const dimensions = result.columns.filter((column) => column.role === 'dimension');
  const measures = result.columns.filter((column) => column.role === 'measure');

  if (dimensions.length === 0) {
    const row = result.rows[0] ?? {};
    return {
      points: measures.map((measure) => ({ category: measure.label, value: toNumber(row[measure.key]) })),
      series: [{ key: 'value', label: 'Value' }],
    };
  }

  const [first, second] = dimensions;

  if (!second) {
    return {
      points: result.rows.map((row) => ({
        category: dimensionLabel(row[first.key]),
        ...Object.fromEntries(measures.map((measure) => [measure.key, toNumber(row[measure.key])])),
      })),
      series: measures.map((measure) => ({ key: measure.key, label: measure.label })),
    };
  }

  const measure = measures[0];
  const seriesLabels: string[] = [];
  const byCategory = new Map<string, Record<string, string | number | null>>();

  for (const row of result.rows) {
    const category = dimensionLabel(row[first.key]);
    const seriesLabel = dimensionLabel(row[second.key]);
    if (!seriesLabels.includes(seriesLabel)) seriesLabels.push(seriesLabel);

    const point = byCategory.get(category) ?? { category };
    point[seriesKey(seriesLabel)] = toNumber(row[measure.key]);
    byCategory.set(category, point);
  }

  return {
    points: [...byCategory.values()],
    series: seriesLabels.map((label) => ({ key: seriesKey(label), label })),
  };
}

function seriesKey(label: string): string {
  return `s_${label.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** The single number a KPI shows: the first measure of the first row. */
export function kpiValue(result: QueryResult): number | null {
  const measure = result.columns.find((column) => column.role === 'measure');
  return measure ? toNumber(result.rows[0]?.[measure.key]) : null;
}

/** Chart series colours (brand blues first, then distinguishable accents). */
export const SERIES_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#06b6d4', '#ef4444'];

// ---------------------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------------------

/** A fresh widget for the builder, with a spec that is valid for the source. */
export function newWidget(type: WidgetType, source: string, fields: SourceField[], existing: Widget[]): Widget {
  const firstDimension = fields.find((field) => field.dimension && field.type === 'string');
  const spec: WidgetSpec = {
    source,
    measures: [{ field: 'records', agg: 'count' }],
    dimensions: type === 'kpi' || !firstDimension ? [] : [{ field: firstDimension.key }],
    filters: [],
    having: [],
    limit: type === 'table' || type === 'list' ? 50 : 100,
  };

  return {
    id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: 'New widget',
    type,
    spec,
    layout: placeNew(existing, defaultSize(type)),
    options: {},
  };
}

/** Drops parts of a spec that no longer fit after the source or chart type changed. */
export function sanitizeSpec(spec: WidgetSpec, type: WidgetType, fields: SourceField[]): WidgetSpec {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  let measures = spec.measures.filter((measure) => byKey.get(measure.field)?.aggregations.includes(measure.agg));
  if (measures.length === 0) measures = [{ field: 'records', agg: 'count' }];

  const maxDimensions = type === 'kpi' ? 0 : type === 'pie' ? 1 : 2;
  const dimensions = (spec.dimensions ?? [])
    .filter((dimension) => byKey.get(dimension.field)?.dimension)
    .map((dimension) => (byKey.get(dimension.field)?.type === 'date' ? dimension : { field: dimension.field }))
    .slice(0, maxDimensions);
  const filters = (spec.filters ?? []).filter((filter) => byKey.get(filter.field)?.dimension);
  const having = (spec.having ?? []).filter((item) => item.measure < measures.length);

  const sortValid = spec.sort
    && ((spec.sort.by[0] === 'd' && Number(spec.sort.by.slice(1)) < dimensions.length)
      || (spec.sort.by[0] === 'm' && Number(spec.sort.by.slice(1)) < measures.length));

  return {
    ...spec,
    measures: type === 'pie' || type === 'kpi' ? measures.slice(0, 1) : measures,
    dimensions,
    filters,
    having,
    sort: sortValid ? spec.sort : null,
  };
}

export type { ResultRow };
