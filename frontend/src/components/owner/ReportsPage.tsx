/** Reports & analytics generator covering all 11 SRS §13 report specifications (SRS §5.15). */
import { useState, type FormEvent } from 'react';
import { CalendarClock, Download, FileText, Plus, Printer, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { downloadFile, isApiConfigured } from '../../api/http';
import { OWNER, useInstitutions, useOwnerMutation } from '../../api/ownerApi';
import {
  ownerOperationsApi,
  useExportHistory,
  useReportCatalog,
  useReportPreview,
  useReportSchedules,
  useSavedReports,
} from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function ReportsPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('builder');
  const [reportKey, setReportKey] = useState('institution');
  const [institutionId, setInstitutionId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exportErr, setExportErr] = useState('');
  const [savingDialog, setSavingDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);

  const canExport = can(OWNER.reportsExport);
  const institutions = useInstitutions({ perPage: 100 });
  const catalog = useReportCatalog();
  const preview = useReportPreview({
    reportKey,
    institutionId: institutionId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const saved = useSavedReports();
  const schedules = useReportSchedules();
  const exports = useExportHistory();

  const deleteSavedMut = useOwnerMutation((id: number) => ownerOperationsApi.deleteSavedReport(id));

  const runExport = async (format: 'csv' | 'html') => {
    setExportErr('');
    if (!isApiConfigured()) {
      setExportErr('Direct file export requires the live Laravel backend. Live preview works offline.');
      return;
    }
    try {
      await downloadFile(
        '/owner/reports/export',
        { reportKey, format, institutionId: institutionId || undefined, status: status || undefined, from: from || undefined, to: to || undefined },
        `${reportKey}-report.${format === 'html' ? 'html' : 'csv'}`,
      );
      void exports.refetch();
    } catch (error) {
      setExportErr(errorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & analytics"
        description="Run, save, schedule, and export all 11 SRS §13 platform, commercial, AI telemetry, oversight, support, and system reports."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setSavingDialog(true)}>
              <Plus size={14} /> Save view
            </Button>
            {canExport ? (
              <>
                <Button size="sm" variant="outline" onClick={() => void runExport('html')}>
                  <Printer size={14} /> Printable HTML
                </Button>
                <Button size="sm" onClick={() => void runExport('csv')}>
                  <Download size={14} /> Export CSV
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {exportErr ? (
        <Alert variant="destructive">
          <AlertDescription>{exportErr}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="builder">Report builder</TabsTrigger>
          <TabsTrigger value="saved">Saved views</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="history">Export audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-5">
              <Field label="Report template">
                <Select aria-label="Report key" value={reportKey} onChange={(e) => setReportKey(e.target.value)}>
                  {(catalog.data ?? [{ key: reportKey, label: reportKey }]).map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Institution (optional)">
                <Select aria-label="Report institution" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                  <option value="">All institutions</option>
                  {institutions.data?.data.map((i) => (
                    <option key={i.id} value={String(i.id)}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status filter">
                <Input placeholder="e.g. active, paid, open..." value={status} onChange={(e) => setStatus(e.target.value)} />
              </Field>
              <Field label="From date">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To date">
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          {preview.isPending ? <LoadingRows rows={5} /> : null}
          {preview.isError ? <ErrorState error={preview.error} onRetry={() => void preview.refetch()} /> : null}
          {preview.data ? (
            <Card>
              <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText size={16} /> {preview.data.label}
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(preview.data.summary).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-2xs">
                        {k}: {String(v)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {preview.data.rows.length === 0 ? (
                  <div className="p-4"><EmptyState title="No rows match current report filters" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {preview.data.columns.map((col, idx) => (
                            <TableHead key={idx}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.data.rows.map((row, rIdx) => (
                          <TableRow key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <TableCell key={cIdx} className="text-xs">
                                {cell ?? '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 pt-4">
          {saved.isPending ? <LoadingRows rows={3} /> : null}
          {saved.isError ? <ErrorState error={saved.error} /> : null}
          {saved.data && saved.data.length === 0 ? <EmptyState title="No saved reports yet" description="Save a configured filter view from the Report Builder." /> : null}
          {saved.data && saved.data.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {saved.data.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Template: {item.reportKey} · Format: {item.format.toUpperCase()} · Last run {formatDateTime(item.lastRunAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReportKey(item.reportKey);
                          setInstitutionId(String(item.filters?.institutionId ?? ''));
                          setStatus(String(item.filters?.status ?? ''));
                          setTab('builder');
                        }}
                      >
                        Run
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void deleteSavedMut.mutateAsync(item.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setScheduleDialog(true)}>
              <CalendarClock size={14} /> Add schedule
            </Button>
          </div>
          {schedules.isPending ? <LoadingRows rows={3} /> : null}
          {schedules.isError ? <ErrorState error={schedules.error} /> : null}
          {schedules.data && schedules.data.length === 0 ? <EmptyState title="No scheduled reports configured" /> : null}
          {schedules.data && schedules.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Next run</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.data.map((sched) => (
                      <TableRow key={sched.id}>
                        <TableCell className="font-medium">{sched.name}</TableCell>
                        <TableCell className="font-mono text-xs">{sched.reportKey}</TableCell>
                        <TableCell className="capitalize">{sched.frequency}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{sched.recipients.join(', ')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(sched.nextRunAt)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={sched.isActive ? 'success' : 'secondary'}>{sched.isActive ? 'Active' : 'Paused'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          {exports.isPending ? <LoadingRows rows={3} /> : null}
          {exports.isError ? <ErrorState error={exports.error} /> : null}
          {exports.data && exports.data.length === 0 ? <EmptyState title="No exports logged yet" /> : null}
          {exports.data && exports.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead className="text-right">Exported at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exports.data.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">{job.reportKey}</TableCell>
                        <TableCell className="uppercase">{job.format}</TableCell>
                        <TableCell>{job.rowCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{job.fileName ?? '—'}</TableCell>
                        <TableCell className="text-xs">{job.actor ?? 'System'}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{formatDateTime(job.exportedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {savingDialog ? (
        <SaveReportDialog
          reportKey={reportKey}
          filters={{ institutionId: institutionId || undefined, status: status || undefined, from: from || undefined, to: to || undefined }}
          onClose={() => setSavingDialog(false)}
        />
      ) : null}
      {scheduleDialog ? (
        <CreateScheduleDialog
          catalog={catalog.data ?? []}
          defaultKey={reportKey}
          onClose={() => setScheduleDialog(false)}
        />
      ) : null}
    </div>
  );
}

function SaveReportDialog({ reportKey, filters, onClose }: { reportKey: string; filters: Record<string, unknown>; onClose: () => void }) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('csv');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.saveReport);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({ name, reportKey, filters, format });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Save report configuration</DialogTitle>
            <DialogDescription>Persist this report template and filter preset for one-click re-runs.</DialogDescription>
          </DialogHeader>
          {err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="View name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Active Revenue" />
          </Field>
          <Field label="Default export format">
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="html">Printable HTML</option>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save view</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateScheduleDialog({ catalog, defaultKey, onClose }: { catalog: { key: string; label: string }[]; defaultKey: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [reportKey, setReportKey] = useState(defaultKey);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipientsRaw, setRecipientsRaw] = useState('owner@demo.com');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createSchedule);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const recipients = recipientsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await mut.mutateAsync({ name, reportKey, frequency, recipients });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Schedule recurring report</DialogTitle>
            <DialogDescription>Automate periodic delivery of report snapshots.</DialogDescription>
          </DialogHeader>
          {err ? (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Schedule name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Executive Digest" />
          </Field>
          <Field label="Report template">
            <Select value={reportKey} onChange={(e) => setReportKey(e.target.value)}>
              {(catalog.length ? catalog : [{ key: defaultKey, label: defaultKey }]).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Frequency">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Recipient emails (comma-separated)">
            <Input required value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

