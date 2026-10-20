import React from 'react';
import { Clock, LockKeyhole, SearchX } from 'lucide-react';

type TenantStateStatus = 401 | 403 | 404;

interface TenantStateProps {
  status: TenantStateStatus;
  /** Server message; shown for 403 so "Your account is not linked to an institution." reaches the user. */
  message?: string;
  /** Institution name for the 404 text. */
  institutionName?: string;
  actionLabel: string;
  onAction: () => void;
}

const statusStyles: Record<TenantStateStatus, { badge: string; icon: string }> = {
  404: { badge: 'bg-[#eef4fa] text-[#123a66]', icon: 'text-[#0b4d88]' },
  403: { badge: 'bg-[#fff4e5] text-[#8a4b00]', icon: 'text-[#8a4b00]' },
  401: { badge: 'bg-[#fef3f2] text-[#8a1c12]', icon: 'text-[#b42318]' },
};

/**
 * Full-panel state for a request the tenant rules refused. A 404 never says the record
 * exists in another institution.
 */
export const TenantState: React.FC<TenantStateProps> = ({ status, message, institutionName, actionLabel, onAction }) => {
  const Icon = status === 404 ? SearchX : status === 403 ? LockKeyhole : Clock;
  const title =
    status === 404 ? 'Record not found' : status === 403 ? "You don't have access" : 'Your session has expired';
  const body =
    status === 404
      ? `This record doesn't exist in ${institutionName ?? 'your institution'}, or it was removed. Check the link or search the list.`
      : status === 403
        ? message ?? 'Your role does not allow this. Ask your institution admin if you need it.'
        : 'Sign in again to continue.';

  return (
    <div
      role={status === 401 ? 'alertdialog' : 'status'}
      className="mx-auto flex max-w-md flex-col gap-3 rounded-[20px] border border-[#d5e4f2] bg-white p-7"
    >
      <span className={`self-start rounded-full px-2.5 py-1 font-mono text-xs font-bold ${statusStyles[status].badge}`}>
        {status}
      </span>
      <Icon size={36} className={statusStyles[status].icon} aria-hidden="true" />
      <h2 className="text-xl font-bold text-[#0a2342]">{title}</h2>
      <p className="text-[15px] leading-relaxed text-[#4d6d8f]">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-2 inline-flex min-h-11 items-center self-start rounded-[10px] bg-[#0b4d88] px-4 text-[15px] font-semibold text-white transition hover:bg-[#08467a]"
      >
        {actionLabel}
      </button>
    </div>
  );
};
