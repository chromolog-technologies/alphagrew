import { AlertCircle, Lock } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BatchResult, QueryResult, ValueFormat, Widget } from '../../api/dashboardsApi';
import { Skeleton } from '../ui';
import { dimensionLabel, formatValue, kpiValue, SERIES_COLORS, toChartData } from './dashboardUtils';

interface WidgetViewProps {
  widget: Widget;
  result?: BatchResult;
  loading?: boolean;
  /** The KPI sits on a gradient card, so its text is white. */
  onGradient?: boolean;
}

/** The body of a widget card: a chart, table or number for one query result. */
export function WidgetView({ widget, result, loading, onGradient = false }: WidgetViewProps) {
  if (loading || !result) {
    return widget.type === 'kpi'
      ? <Skeleton className={`h-8 w-24 ${onGradient ? 'bg-white/20' : ''}`} />
      : <Skeleton className="h-full min-h-24 w-full" />;
  }

  if (!('columns' in result)) {
    const forbidden = result.status === 403;
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-2 text-center text-sm ${onGradient ? 'text-white/80' : 'text-muted-foreground'}`}>
        {forbidden ? <Lock size={18} /> : <AlertCircle size={18} className={onGradient ? '' : 'text-warning'} />}
        <p>{forbidden ? 'Not available for your role.' : result.message}</p>
      </div>
    );
  }

  const format = widget.options?.format;

  if (widget.type === 'kpi') {
    return <KpiValue result={result} format={format} target={widget.options?.target} onGradient={onGradient} />;
  }

  if (result.rows.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</p>;
  }

  if (widget.type === 'table' || widget.type === 'list') {
    return <ResultTable result={result} format={format} compact={widget.type === 'list'} />;
  }

  return <ResultChart widget={widget} result={result} />;
}

function KpiValue({ result, format, target, onGradient }: { result: QueryResult; format?: ValueFormat; target?: number; onGradient: boolean }) {
  const value = kpiValue(result);
  const belowTarget = target !== undefined && value !== null && value < target;
  const valueColor = onGradient ? 'text-white' : belowTarget ? 'text-warning' : 'text-foreground';

  return (
    <div>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${valueColor}`}>{formatValue(value, format)}</p>
      {target !== undefined ? (
        <p className={`mt-1.5 text-xs ${onGradient ? 'text-white/75' : 'text-muted-foreground'}`}>
          Target <span className={`font-semibold ${onGradient ? 'text-white' : 'text-foreground'}`}>{formatValue(target, format)}</span>
          {belowTarget ? <span className={onGradient ? '' : 'text-warning'}> · below target</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function ResultTable({ result, format, compact }: { result: QueryResult; format?: ValueFormat; compact: boolean }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted-foreground">
            {result.columns
              .filter((column) => !(compact && column.role === 'measure' && column.field === 'records'))
              .map((column) => (
                <th key={column.key} className={`px-2 py-2 font-semibold ${column.role === 'measure' ? 'text-right' : ''}`}>
                  {column.label}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, index) => (
            <tr key={index} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50">
              {result.columns
                .filter((column) => !(compact && column.role === 'measure' && column.field === 'records'))
                .map((column) => (
                  <td key={column.key} className={`px-2 py-2 ${column.role === 'measure' ? 'text-right font-semibold tabular-nums text-foreground' : 'text-foreground/80'}`}>
                    {column.role === 'measure' ? formatValue(row[column.key], format) : dimensionLabel(row[column.key])}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated ? <p className="px-2 py-2 text-xs text-muted-foreground">Showing the first {result.rows.length} rows.</p> : null}
    </div>
  );
}

function ResultChart({ widget, result }: { widget: Widget; result: QueryResult }) {
  const { points, series } = toChartData(result);
  const format = widget.options?.format;
  const tick = { fill: '#6b7280', fontSize: 11 };
  const tooltipStyle = { borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 8px 24px -6px #00000024', fontSize: 12 };
  const tooltipFormatter = (value: unknown) => formatValue(value, format);
  const colorFor = (index: number) => (index === 0 && widget.options?.color) || SERIES_COLORS[index % SERIES_COLORS.length];

  if (widget.type === 'pie') {
    const key = series[0]?.key ?? 'value';
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={points} dataKey={key} nameKey="category" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
            {points.map((_, index) => <Cell key={index} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const target = widget.options?.target;
  const axes = (
    <>
      <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="category" tickLine={false} axisLine={false} tick={tick} interval="preserveStartEnd" />
      <YAxis tickLine={false} axisLine={false} tick={tick} width={44} tickFormatter={(value) => formatValue(value, format)} />
      <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
      {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} /> : null}
      {target !== undefined ? <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="4 4" /> : null}
    </>
  );

  if (widget.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          {axes}
          {series.map((item, index) => (
            <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={colorFor(index)} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points}>
        {axes}
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={colorFor(index)}
            radius={[4, 4, 0, 0]}
            stackId={widget.options?.stacked ? 'stack' : undefined}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
