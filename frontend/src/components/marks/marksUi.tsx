import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { MarkEntryStatus, Semester } from '../../api/marksApi';

const statusStyles: Record<MarkEntryStatus, string> = {
  new: 'bg-slate-100 text-slate-600',
  draft: 'bg-[#eef4fa] text-[#123a66]',
  submitted: 'bg-[#fff4e5] text-[#8a4b00]',
  verified: 'bg-[#e6f1fb] text-[#0b4d88]',
  approved: 'bg-[#ecfdf3] text-[#05603a]',
  locked: 'bg-[#0a2342] text-white',
};

export const statusLabels: Record<MarkEntryStatus, string> = {
  new: 'Not entered',
  draft: 'Draft',
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  locked: 'Published',
};

export const StatusBadge: React.FC<{ status: MarkEntryStatus }> = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] ?? statusStyles.new}`}>
    {statusLabels[status] ?? status}
  </span>
);

export const Card: React.FC<{ title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  description,
  action,
  children,
}) => (
  <section className="rounded-[20px] border border-[#d5e4f2] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-[#0a2342]">{title}</h3>
        {description ? <p className="mt-1 text-sm text-[#4d6d8f]">{description}</p> : null}
      </div>
      {action}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

type NoticeTone = 'info' | 'error' | 'success';

const noticeStyles: Record<NoticeTone, string> = {
  info: 'border-[#c7def3] bg-[#eef6ff] text-[#123a66]',
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-[#b7e4c7] bg-[#ecfdf3] text-[#05603a]',
};

export const Notice: React.FC<{ tone?: NoticeTone; children: React.ReactNode }> = ({ tone = 'info', children }) => {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-[14px] border px-4 py-3 text-sm ${noticeStyles[tone]}`}>
      <Icon size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
};

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-[16px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{children}</div>
);

export const SemesterSelect: React.FC<{
  id: string;
  semesters: Semester[];
  value: number | '';
  onChange: (semesterId: number | '') => void;
}> = ({ id, semesters, value, onChange }) => (
  <div className="flex min-w-[220px] flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-[#123a66]">
      Semester
    </label>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
      className={selectClass}
    >
      <option value="">Choose a semester</option>
      {semesters.map((semester) => (
        <option key={semester.id} value={semester.id}>
          {semester.name}
          {semester.academic_year?.name ? ` · ${semester.academic_year.name}` : ''}
        </option>
      ))}
    </select>
  </div>
);

export const selectClass =
  'h-11 rounded-[12px] border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100';

export const inputClass =
  'h-11 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

export const primaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#0b4d88] px-4 text-sm font-semibold text-white transition hover:bg-[#08467a] disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-semibold text-[#123a66] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50';

export function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Number input value → number or null (empty). */
export function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
