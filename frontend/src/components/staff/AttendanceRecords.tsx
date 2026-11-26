/**
 * Attendance → Records: find marked attendance by date and correct it (status, remarks) or
 * delete a wrong entry. Faculty who only mark their own subjects can only change their own
 * records; the server enforces that.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { http } from '../../api/http';
import { ExportButton } from '../shared/ExportButton';
import { Alert, AlertDescription, Button, Card, Input, Label, Select, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';

type Status = 'present' | 'absent' | 'leave' | 'other';
const STATUSES: Status[] = ['present', 'absent', 'leave', 'other'];

interface AttendanceRecord {
  id: number;
  attendance_date: string;
  status: Status;
  remarks: string | null;
  is_approved: boolean;
  student?: { id: number; name: string; registration_number?: string } | null;
  subject?: { id: number; name: string; code: string } | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AttendanceRecords() {
  const client = useQueryClient();
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<Status | ''>('');

  const records = useQuery({
    queryKey: ['attendance', 'records', date, status],
    queryFn: () =>
      http
        .get<{ attendance: AttendanceRecord[] }>('/attendance', { from_date: date, to_date: date, status: status || undefined, per_page: 100 })
        .then((r) => r.attendance),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['attendance'] });
  const update = useMutation({
    mutationFn: ({ id, status: next, remarks }: { id: number; status: Status; remarks: string | null }) => http.put(`/attendance/${id}`, { status: next, remarks }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: number) => http.delete(`/attendance/${id}`), onSuccess: refresh });

  const error = update.error ?? remove.error;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="att-date">Date</Label>
          <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="att-status">Status</Label>
          <Select id="att-status" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <ExportButton type="attendance" query={{ from: date, to: date }} label="Export this day" />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof ApiError ? error.message : 'The change could not be saved.'}</AlertDescription>
        </Alert>
      ) : null}

      {records.isLoading ? (
        <Skeleton className="h-32" />
      ) : records.error ? (
        <Alert variant="destructive">
          <AlertDescription>{records.error instanceof ApiError ? records.error.message : 'Attendance could not be loaded.'}</AlertDescription>
        </Alert>
      ) : (records.data ?? []).length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No attendance marked on this date.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(records.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.student?.name ?? `#${r.id}`}
                  {r.is_approved ? <span className="ml-2 text-2xs text-muted-foreground">approved</span> : null}
                </TableCell>
                <TableCell>{r.subject ? `${r.subject.code}` : '—'}</TableCell>
                <TableCell>
                  <Select
                    aria-label={`Status of ${r.student?.name ?? r.id}`}
                    value={r.status}
                    disabled={update.isPending}
                    onChange={(e) => update.mutate({ id: r.id, status: e.target.value as Status, remarks: r.remarks })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    aria-label={`Remarks for ${r.student?.name ?? r.id}`}
                    defaultValue={r.remarks ?? ''}
                    maxLength={1000}
                    onBlur={(e) => {
                      const remarks = e.target.value.trim() || null;
                      if (remarks !== (r.remarks ?? null)) update.mutate({ id: r.id, status: r.status, remarks });
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete attendance of ${r.student?.name ?? r.id}`} disabled={remove.isPending} onClick={() => remove.mutate(r.id)}>
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
