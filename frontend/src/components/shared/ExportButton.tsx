/** "Export CSV" button for one export type; shows the server's message if the export fails. */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadExport, type ExportType } from '../../api/exportsApi';

interface ExportButtonProps {
  type: ExportType;
  query?: Record<string, string | number | undefined>;
  label?: string;
  className?: string;
}

export function ExportButton({ type, query, label = 'Export CSV', className }: ExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await downloadExport(type, query);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'The export could not be downloaded.');
          } finally {
            setBusy(false);
          }
        }}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'
        }
      >
        <Download size={15} aria-hidden="true" />
        {busy ? 'Preparing…' : label}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
