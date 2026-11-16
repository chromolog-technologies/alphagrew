/**
 * CSV import of students or staff: download the template, check the file (dry run, nothing is
 * saved), then import the valid rows. New accounts get an email to set their password.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { http } from '../../api/http';
import { Alert, AlertDescription, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui';

export type ImportType = 'students' | 'staff';

interface ImportReport {
  dryRun: boolean;
  total: number;
  valid: number;
  created: number;
  failed: { row: number; email: string | null; errors: Record<string, string> }[];
  emailsNotSent: number;
}

const TEMPLATES: Record<ImportType, string> = {
  students: 'name,email,department_code,year,gender,phone,cgpa,attendance,fee_status\nAsha Menon,asha@example.com,CSE,year_1,female,9876543210,0,0,pending\n',
  staff: 'name,email,department_code,designation,role,phone\nRavi Kumar,ravi@example.com,CSE,Assistant Professor,staff,9876543210\n',
};

export function ImportDialog({ type, open, onClose, onImported }: { type: ImportType; open: boolean; onClose: () => void; onImported?: () => void }) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const upload = useMutation({
    mutationFn: (dryRun: boolean) => {
      const body = new FormData();
      body.append('file', file as File);
      if (dryRun) body.append('dryRun', '1');
      return http.post<{ data: ImportReport }>(`/imports/${type}`, body).then((r) => r.data);
    },
    onSuccess: (result) => {
      setReport(result);
      if (!result.dryRun && result.created > 0) {
        client.invalidateQueries();
        onImported?.();
      }
    },
  });

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATES[type]], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-import-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const close = () => {
    setFile(null);
    setReport(null);
    upload.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {type} from CSV</DialogTitle>
          <DialogDescription>
            Check the file first; nothing is saved until you import. New accounts receive an email to set their password.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={downloadTemplate}>
            <Download size={14} /> Template
          </Button>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setReport(null);
              upload.reset();
            }}
            className="text-sm"
          />
        </div>

        {upload.error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>
              {upload.error instanceof ApiError ? Object.values(upload.error.firstFieldErrors)[0] ?? upload.error.message : 'The file could not be read.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {report ? (
          <div className="mt-3 space-y-2 text-sm" aria-live="polite">
            <p>
              {report.dryRun
                ? `${report.valid} of ${report.total} rows are ready to import.`
                : `${report.created} imported, ${report.failed.length} skipped.`}
              {!report.dryRun && report.emailsNotSent > 0 ? ` ${report.emailsNotSent} setup emails could not be sent; those people can use "Forgot password" on the sign-in page.` : ''}
            </p>
            {report.failed.length > 0 ? (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-2 py-1">Row</th>
                      <th className="px-2 py-1">Email</th>
                      <th className="px-2 py-1">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.failed.map((f) => (
                      <tr key={f.row} className="border-t border-border">
                        <td className="px-2 py-1">{f.row}</td>
                        <td className="px-2 py-1">{f.email || '—'}</td>
                        <td className="px-2 py-1 text-destructive">{Object.values(f.errors).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={close}>
            {report && !report.dryRun ? 'Done' : 'Cancel'}
          </Button>
          <Button type="button" variant="outline" disabled={!file || upload.isPending} onClick={() => upload.mutate(true)}>
            Check file
          </Button>
          <Button type="button" className="gap-1" disabled={!file || upload.isPending || !report?.dryRun || report.valid === 0} onClick={() => upload.mutate(false)}>
            <Upload size={14} /> Import {report?.dryRun ? report.valid : ''} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
