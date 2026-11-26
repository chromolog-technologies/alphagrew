/**
 * Department reports for staff: published results and attendance per subject, and placement,
 * for the signed-in staff member's own department (GET /department-portal/reports).
 */
import { useState } from 'react';
import { ApiError } from '../../api/apiError';
import { useDepartmentReports } from '../../api/departmentPortalApi';
import { ExportButton } from '../shared/ExportButton';
import { Alert, AlertDescription, Card, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';

type Tab = 'academic' | 'attendance' | 'placement';

const pct = (value: number | null) => (value === null ? '—' : `${value}%`);

export function HODReportsAnalytics({ departmentCode }: { departmentCode?: string } = {}) {
  const reports = useDepartmentReports(departmentCode);
  const [tab, setTab] = useState<Tab>('academic');

  if (reports.isLoading) return <Skeleton className="h-48 w-full" />;
  if (reports.error || !reports.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{reports.error instanceof ApiError ? reports.error.message : 'Reports could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const { academic, attendance, placement } = reports.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Department reports</h1>
        <p className="text-sm text-muted-foreground">Published results, attendance and placement for your department.</p>
      </div>
      <div className="flex justify-end">
        <ExportButton type="results" label="Download published results" />
      </div>

      <div className="flex gap-2 border-b border-border" role="tablist">
        {(
          [
            ['academic', 'Academic performance'],
            ['attendance', 'Attendance'],
            ['placement', 'Placement'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'academic' ? (
        <Card className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Students with published marks</TableHead>
                <TableHead>Average marks</TableHead>
                <TableHead>Pass %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {academic.map((row) => (
                <TableRow key={row.subjectId}>
                  <TableCell>
                    {row.code} · {row.name}
                  </TableCell>
                  <TableCell>{row.students}</TableCell>
                  <TableCell>{row.averageMarks ?? '—'}</TableCell>
                  <TableCell>{pct(row.passPercentage)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {academic.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No subjects in this department yet.</p> : null}
        </Card>
      ) : null}

      {tab === 'attendance' ? (
        <Card className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Present %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((row) => (
                <TableRow key={row.subjectId}>
                  <TableCell>
                    {row.code} · {row.name}
                  </TableCell>
                  <TableCell>{row.records}</TableCell>
                  <TableCell>{pct(row.presentPercentage)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {tab === 'placement' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-2 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Placed:</span> {placement.placed} of {placement.students} ({placement.placementRate}%)
            </p>
            <p>
              <span className="text-muted-foreground">Offers:</span> {placement.offers}
            </p>
            <p>
              <span className="text-muted-foreground">Average offer:</span> {placement.averageOfferLpa} LPA ·{' '}
              <span className="text-muted-foreground">Highest:</span> {placement.highestOfferLpa} LPA
            </p>
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Top recruiters</h2>
            {placement.topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No placements yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {placement.topCompanies.map((c) => (
                  <li key={c.company} className="flex justify-between">
                    <span>{c.company}</span>
                    <span className="text-muted-foreground">{c.students}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
