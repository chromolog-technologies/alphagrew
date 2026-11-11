/** Small presentational building blocks used across CampusWorkspace screens. */
import type { CardTone } from './types';
import { cardToneStyles, classNames } from './helpers';
import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TrendingUp, Users, X } from 'lucide-react';

export function Panel({ children, className }: { children: ReactNode; className?: string; key?: string | number }) {
  return (
    <section
      className={classNames(
        'heroui-card',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-1">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{title}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">{description}</h2>
      </div>
      {action}
    </div>
  );
}

export function Sparkline({ points, color = '#2563eb' }: { points: number[]; color?: string }) {
  if (points.length === 0) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;
  const width = 50;
  const height = 16;
  const padding = 1;
  const svgPoints = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const pathD = `M ${svgPoints.join(' L ')}`;
  
  return (
    <svg width={width} height={height} className="shrink-0 opacity-85">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'navy',
  sparklineData = [12, 16, 14, 20, 18, 22, 21, 25]
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Users;
  tone?: CardTone;
  sparklineData?: number[];
}) {
  const toneStyles = cardToneStyles[tone];
  
  const colors: Record<CardTone, string> = {
    navy: '#006fee',
    sky: '#0284c7',
    teal: '#0d9488',
    amber: '#d97706',
    indigo: '#246bfc',
    emerald: '#10b981'
  };
  const strokeColor = colors[tone] || '#006fee';

  return (
    <section className="heroui-card p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className={classNames('flex h-10 w-10 items-center justify-center rounded-xl font-semibold', toneStyles.icon)}>
          <Icon size={18} />
        </div>
        <span className="trend-chip trend-chip-up">
          <TrendingUp size={12} />
          {helper || '+8.4%'}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 leading-none">{value}</p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">{label}</p>
        </div>
        <div className="shrink-0">
          <Sparkline points={sparklineData} color={strokeColor} />
        </div>
      </div>
    </section>
  );
}

export function DashboardHighlightCard({
  label,
  value,
  detail,
  meta,
  icon: Icon,
  tone = 'navy',
}: {
  label: string;
  value: string | number;
  detail: string;
  meta: string;
  icon: typeof Users;
  tone?: CardTone;
}) {
  const toneStyles = cardToneStyles[tone];

  return (
    <section className="heroui-card p-5 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className={classNames('flex h-10 w-10 items-center justify-center rounded-xl font-semibold', toneStyles.icon)}>
          <Icon size={18} />
        </div>
        <span className={classNames('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider', toneStyles.helper)}>
          {meta}
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-zinc-900 tracking-tight leading-none">{value}</p>
      <p className="mt-2 text-xs text-zinc-500 leading-relaxed">{detail}</p>
    </section>
  );
}

export function AdminSnapshotCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'navy',
  sparklineData = [12, 16, 14, 20, 18, 22, 21, 25]
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
  className?: string;
  tone?: CardTone;
  sparklineData?: number[];
}) {
  const toneStyles = cardToneStyles[tone];
  
  const colors: Record<CardTone, string> = {
    navy: '#006fee',
    sky: '#0284c7',
    teal: '#0d9488',
    amber: '#d97706',
    indigo: '#246bfc',
    emerald: '#10b981'
  };
  const strokeColor = colors[tone] || '#006fee';

  return (
    <section className="heroui-card p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className={classNames('flex h-10 w-10 items-center justify-center rounded-xl font-semibold', toneStyles.icon)}>
          <Icon size={18} />
        </div>
        <span className="trend-chip trend-chip-up">
          <TrendingUp size={12} />
          {note}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 leading-none">{value}</p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">{label}</p>
        </div>
        <div className="shrink-0">
          <Sparkline points={sparklineData} color={strokeColor} />
        </div>
      </div>
    </section>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  compact = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className={`my-6 w-full rounded-2xl border border-zinc-200/90 bg-white shadow-2xl ${
            compact ? 'max-w-md p-6' : 'max-w-2xl p-7'
          }`}
        >
          <div className={`flex items-start justify-between gap-4 ${compact ? 'mb-4' : 'mb-5'}`}>
            <div>
              <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-extrabold tracking-tight text-zinc-900`}>{title}</h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
