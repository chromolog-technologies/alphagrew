/**
 * Marks → Grade rules & schemes: edit the institution's grading scale and the mark scheme
 * (internal / external / total maximum and pass marks) of each subject per semester.
 * Mark entry grades against these, so only users with marks.create change them.
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall, semesterApi } from '../../api/apiClient';
import { http } from '../../api/http';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

interface GradeRule {
  id: number;
  grade: string;
  gradePoint: number;
  minScore: number;
  maxScore: number;
  isPass: boolean;
  description: string | null;
  sortOrder: number;
}

interface MarkScheme {
  id: number;
  subjectId: number;
  semesterId: number;
  subject?: { id: number; code: string; name: string };
  semester?: { id: number; name: string };
  internalMax: number;
  externalMax: number;
  totalMax: number;
  internalPass: number;
  externalPass: number;
  totalPass: number;
  extraMarksAllowed: number;
  isActive: boolean;
}

type Option = { id: number; name: string; code?: string };
const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];

const keys = { rules: ['marks', 'grade-rules'] as const, schemes: ['marks', 'mark-schemes'] as const };

function useSave<T>(path: string, key: readonly unknown[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: T }) => (id === null ? http.post(path, input) : http.put(`${path}/${id}`, input)),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

function useRemove(path: string, key: readonly unknown[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => http.delete(`${path}/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

const errorText = (error: unknown) =>
  error instanceof ApiError ? Object.values(error.firstFieldErrors)[0] ?? error.message : error ? 'The change could not be saved.' : null;

type RuleDraft = { id: number | null; grade: string; gradePoint: string; minScore: string; maxScore: string; isPass: boolean; description: string };
type SchemeDraft = {
  id: number | null; subjectId: string; semesterId: string; internalMax: string; externalMax: string; totalMax: string;
  internalPass: string; externalPass: string; totalPass: string;
};

export function GradeScalesPanel({ canEdit }: { canEdit: boolean }) {
  const client = useQueryClient();
  const rules = useQuery({ queryKey: keys.rules, queryFn: () => http.get<{ data: GradeRule[] }>('/grade-rules').then((r) => r.data) });
  const schemes = useQuery({ queryKey: keys.schemes, queryFn: () => http.get<{ data: MarkScheme[] }>('/mark-schemes').then((r) => r.data) });
  const subjects = useQuery({ queryKey: ['subjects', 'options'], queryFn: () => apiCall('/subjects').then(asList), enabled: canEdit });
  const semesters = useQuery({ queryKey: ['semesters', 'options'], queryFn: () => semesterApi.list().then(asList), enabled: canEdit });

  const saveRule = useSave<object>('/grade-rules', keys.rules);
  const removeRule = useRemove('/grade-rules', keys.rules);
  const saveScheme = useSave<object>('/mark-schemes', keys.schemes);
  const removeScheme = useRemove('/mark-schemes', keys.schemes);
  const setupDefaults = useMutation({
    mutationFn: () => http.post('/grade-rules/setup-defaults'),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.rules }),
  });

  const [rule, setRule] = useState<RuleDraft | null>(null);
  const [scheme, setScheme] = useState<SchemeDraft | null>(null);

  const submitRule = (event: FormEvent) => {
    event.preventDefault();
    if (!rule) return;
    saveRule.mutate(
      {
        id: rule.id,
        input: {
          grade: rule.grade.trim(), gradePoint: Number(rule.gradePoint), minScore: Number(rule.minScore), maxScore: Number(rule.maxScore),
          isPass: rule.isPass, description: rule.description.trim() || null,
        },
      },
      { onSuccess: () => setRule(null) },
    );
  };

  const submitScheme = (event: FormEvent) => {
    event.preventDefault();
    if (!scheme) return;
    saveScheme.mutate(
      {
        id: scheme.id,
        input: {
          subjectId: Number(scheme.subjectId), semesterId: Number(scheme.semesterId),
          internalMax: Number(scheme.internalMax), externalMax: Number(scheme.externalMax), totalMax: Number(scheme.totalMax),
          internalPass: Number(scheme.internalPass), externalPass: Number(scheme.externalPass), totalPass: Number(scheme.totalPass),
        },
      },
      { onSuccess: () => setScheme(null) },
    );
  };

  const num = (label: string, id: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.01" min={0} required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Grading scale</h2>
            <p className="text-xs text-muted-foreground">Percentage ranges mapped to grades and grade points.</p>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              {(rules.data ?? []).length === 0 ? (
                <Button type="button" variant="outline" size="sm" disabled={setupDefaults.isPending} onClick={() => setupDefaults.mutate()}>
                  Use the default scale
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="gap-1"
                onClick={() => {
                  saveRule.reset();
                  setRule({ id: null, grade: '', gradePoint: '', minScore: '', maxScore: '', isPass: true, description: '' });
                }}
              >
                <Plus size={14} /> Add grade
              </Button>
            </div>
          ) : null}
        </div>
        {rules.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Range (%)</TableHead>
                <TableHead>Grade point</TableHead>
                <TableHead>Result</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.grade}</TableCell>
                  <TableCell>
                    {r.minScore} – {r.maxScore}
                  </TableCell>
                  <TableCell>{r.gradePoint}</TableCell>
                  <TableCell>{r.isPass ? <Badge variant="success">Pass</Badge> : <Badge variant="destructive">Fail</Badge>}</TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit grade ${r.grade}`}
                        onClick={() => {
                          saveRule.reset();
                          setRule({ id: r.id, grade: r.grade, gradePoint: String(r.gradePoint), minScore: String(r.minScore), maxScore: String(r.maxScore), isPass: r.isPass, description: r.description ?? '' });
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Delete grade ${r.grade}`} onClick={() => removeRule.mutate(r.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {errorText(removeRule.error) ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{errorText(removeRule.error)}</AlertDescription>
          </Alert>
        ) : null}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Mark schemes</h2>
            <p className="text-xs text-muted-foreground">Maximum and pass marks per subject and semester. Mark entry needs one.</p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              className="gap-1"
              onClick={() => {
                saveScheme.reset();
                setScheme({ id: null, subjectId: '', semesterId: '', internalMax: '40', externalMax: '60', totalMax: '100', internalPass: '0', externalPass: '0', totalPass: '40' });
              }}
            >
              <Plus size={14} /> Add scheme
            </Button>
          ) : null}
        </div>
        {schemes.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Internal</TableHead>
                <TableHead>External</TableHead>
                <TableHead>Total (pass)</TableHead>
                {canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schemes.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.subject ? `${s.subject.code} · ${s.subject.name}` : `#${s.subjectId}`}</TableCell>
                  <TableCell>{s.semester?.name ?? `#${s.semesterId}`}</TableCell>
                  <TableCell>
                    {s.internalMax} (pass {s.internalPass})
                  </TableCell>
                  <TableCell>
                    {s.externalMax} (pass {s.externalPass})
                  </TableCell>
                  <TableCell>
                    {s.totalMax} ({s.totalPass})
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit scheme ${s.subject?.code ?? s.id}`}
                        onClick={() => {
                          saveScheme.reset();
                          setScheme({
                            id: s.id, subjectId: String(s.subjectId), semesterId: String(s.semesterId), internalMax: String(s.internalMax), externalMax: String(s.externalMax),
                            totalMax: String(s.totalMax), internalPass: String(s.internalPass), externalPass: String(s.externalPass), totalPass: String(s.totalPass),
                          });
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Delete scheme ${s.subject?.code ?? s.id}`} onClick={() => removeScheme.mutate(s.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {errorText(removeScheme.error) ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{errorText(removeScheme.error)}</AlertDescription>
          </Alert>
        ) : null}
      </Card>

      <Dialog open={rule !== null} onOpenChange={(isOpen) => !isOpen && setRule(null)}>
        <DialogContent className="max-w-md">
          {rule ? (
            <form onSubmit={submitRule}>
              <DialogHeader>
                <DialogTitle>{rule.id === null ? 'Add grade' : `Edit grade ${rule.grade}`}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gr-grade">Grade *</Label>
                  <Input id="gr-grade" required maxLength={5} value={rule.grade} onChange={(e) => setRule({ ...rule, grade: e.target.value })} />
                </div>
                {num('Grade point *', 'gr-point', rule.gradePoint, (v) => setRule({ ...rule, gradePoint: v }))}
                {num('From % *', 'gr-min', rule.minScore, (v) => setRule({ ...rule, minScore: v }))}
                {num('To % *', 'gr-max', rule.maxScore, (v) => setRule({ ...rule, maxScore: v }))}
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={rule.isPass} onChange={(e) => setRule({ ...rule, isPass: e.target.checked })} /> Counts as a pass
                </label>
              </div>
              {errorText(saveRule.error) ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorText(saveRule.error)}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setRule(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveRule.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={scheme !== null} onOpenChange={(isOpen) => !isOpen && setScheme(null)}>
        <DialogContent className="max-w-lg">
          {scheme ? (
            <form onSubmit={submitScheme}>
              <DialogHeader>
                <DialogTitle>{scheme.id === null ? 'Add mark scheme' : 'Edit mark scheme'}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ms-subject">Subject *</Label>
                  <Select id="ms-subject" required value={scheme.subjectId} onChange={(e) => setScheme({ ...scheme, subjectId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(subjects.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code ? `${s.code} · ${s.name}` : s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ms-semester">Semester *</Label>
                  <Select id="ms-semester" required value={scheme.semesterId} onChange={(e) => setScheme({ ...scheme, semesterId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(semesters.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {num('Internal max *', 'ms-imax', scheme.internalMax, (v) => setScheme({ ...scheme, internalMax: v }))}
                {num('Internal pass *', 'ms-ipass', scheme.internalPass, (v) => setScheme({ ...scheme, internalPass: v }))}
                {num('External max *', 'ms-emax', scheme.externalMax, (v) => setScheme({ ...scheme, externalMax: v }))}
                {num('External pass *', 'ms-epass', scheme.externalPass, (v) => setScheme({ ...scheme, externalPass: v }))}
                {num('Total max *', 'ms-tmax', scheme.totalMax, (v) => setScheme({ ...scheme, totalMax: v }))}
                {num('Total pass *', 'ms-tpass', scheme.totalPass, (v) => setScheme({ ...scheme, totalPass: v }))}
              </div>
              {errorText(saveScheme.error) ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorText(saveScheme.error)}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setScheme(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveScheme.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
