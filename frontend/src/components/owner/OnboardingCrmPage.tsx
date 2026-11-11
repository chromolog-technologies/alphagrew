/** Pre-sales CRM leads pipeline & 9-stage institution onboarding (SRS §5.3 & §5.17). */
import { useState, type FormEvent } from 'react';
import { ArrowRightCircle, CheckSquare, Plus, Square } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
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
import { OWNER, useOwnerMutation } from '../../api/ownerApi';
import {
  ownerOperationsApi,
  useLeads,
  useOnboardingList,
  type OnboardingItem,
  type SalesLead,
} from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDate, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const LEAD_STAGES: SalesLead['stage'][] = ['new', 'contacted', 'demo_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'];
const ONBOARDING_STAGES: OnboardingItem['stage'][] = ['new', 'verification', 'demo', 'proposal', 'agreement', 'payment', 'configuration', 'training', 'go_live'];

export function OnboardingCrmPage({ can, go }: OwnerPageProps) {
  const [tab, setTab] = useState('leads');
  const [leadStageFilter, setLeadStageFilter] = useState('');
  const [onbStatusFilter, setOnbStatusFilter] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);
  const [creatingOnboarding, setCreatingOnboarding] = useState(false);
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);
  const [activeOnboarding, setActiveOnboarding] = useState<OnboardingItem | null>(null);
  const [actionError, setActionError] = useState('');

  const leads = useLeads(leadStageFilter ? { stage: leadStageFilter } : {});
  const onboarding = useOnboardingList(onbStatusFilter ? { status: onbStatusFilter } : {});

  const canCrm = can(OWNER.crmManage);
  const canOnb = can(OWNER.onboardingManage);

  const convertLeadMut = useOwnerMutation((id: number) => ownerOperationsApi.convertLead(id));

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM & tenant onboarding"
        description="Track prospective institutions from first contact and product demo through 9-stage implementation to live tenant provisioning."
        actions={
          <>
            {tab === 'leads' && canCrm ? (
              <Button size="sm" onClick={() => setCreatingLead(true)}>
                <Plus size={14} /> New lead
              </Button>
            ) : null}
            {tab === 'onboarding' && canOnb ? (
              <Button size="sm" onClick={() => setCreatingOnboarding(true)}>
                <Plus size={14} /> Start onboarding
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="leads">CRM leads</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Select className="w-48" aria-label="Filter lead stage" value={leadStageFilter} onChange={(e) => setLeadStageFilter(e.target.value)}>
              <option value="">All pipeline stages</option>
              {LEAD_STAGES.map((st) => (
                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </div>

          {leads.isPending ? <LoadingRows rows={4} /> : null}
          {leads.isError ? <ErrorState error={leads.error} onRetry={() => void leads.refetch()} /> : null}
          {leads.data && leads.data.length === 0 ? <EmptyState title="No CRM leads match" /> : null}
          {leads.data && leads.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Est. Students / MRR</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.data.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setActiveLead(lead)}>
                        <TableCell>
                          <span className="block font-medium text-foreground">{lead.organizationName}</span>
                          <span className="text-xs text-muted-foreground">Source: {lead.source} · {lead.activitiesCount} notes</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="block font-medium">{lead.contactName}</span>
                          <span className="text-muted-foreground">{lead.contactEmail}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={lead.stage === 'won' ? 'success' : lead.stage === 'lost' ? 'destructive' : 'info'} className="capitalize">
                            {lead.stage.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.expectedStudents ? `${lead.expectedStudents.toLocaleString()} students` : '—'}
                          {lead.expectedMrr ? <span className="block text-muted-foreground">MRR ₹{lead.expectedMrr.toLocaleString()}</span> : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(lead.nextFollowUpAt)}</TableCell>
                        <TableCell className="space-x-1 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => setActiveLead(lead)}>
                            Manage
                          </Button>
                          {canCrm && !lead.convertedOnboardingId && lead.stage !== 'lost' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActionError('');
                                void convertLeadMut.mutateAsync(lead.id).then(() => setTab('onboarding')).catch((e) => setActionError(errorMessage(e)));
                              }}
                            >
                              <ArrowRightCircle size={12} /> Convert
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Select className="w-44" aria-label="Filter onboarding status" value={onbStatusFilter} onChange={(e) => setOnbStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          {onboarding.isPending ? <LoadingRows rows={4} /> : null}
          {onboarding.isError ? <ErrorState error={onboarding.error} onRetry={() => void onboarding.refetch()} /> : null}
          {onboarding.data && onboarding.data.length === 0 ? <EmptyState title="No onboarding pipelines running" /> : null}
          {onboarding.data && onboarding.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institution</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checklist</TableHead>
                      <TableHead>Target go-live</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onboarding.data.map((item) => {
                      const done = item.checklist.filter((c) => c.isCompleted).length;
                      return (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setActiveOnboarding(item)}>
                          <TableCell>
                            <span className="block font-medium">{item.institutionName}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.code ?? 'Pending code'} · {item.institutionType}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="block font-medium">{item.contactName}</span>
                            <span className="text-muted-foreground">{item.contactEmail}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="info" className="capitalize">{item.stage.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'completed' ? 'success' : item.status === 'blocked' ? 'destructive' : 'secondary'} className="capitalize">
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {done} / {item.checklist.length} done
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(item.targetGoLiveAt)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {item.institution ? (
                              <Button size="sm" variant="outline" onClick={() => go(`institutions/${item.institution!.id}`)}>
                                View tenant
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setActiveOnboarding(item)}>
                                Manage
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {creatingLead ? <CreateLeadDialog onClose={() => setCreatingLead(false)} /> : null}
      {creatingOnboarding ? <CreateOnboardingDialog onClose={() => setCreatingOnboarding(false)} /> : null}
      {activeLead ? <LeadDetailDialog lead={activeLead} canManage={canCrm} onClose={() => setActiveLead(null)} /> : null}
      {activeOnboarding ? (
        <OnboardingDetailDialog
          item={activeOnboarding}
          canManage={canOnb}
          onClose={() => setActiveOnboarding(null)}
          onConverted={(instId) => go(`institutions/${instId}`)}
        />
      ) : null}
    </div>
  );
}

function CreateLeadDialog({ onClose }: { onClose: () => void }) {
  const [organizationName, setOrganizationName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [source, setSource] = useState('inbound');
  const [expectedStudents, setExpectedStudents] = useState('');
  const [expectedMrr, setExpectedMrr] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createLead);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({
        organizationName,
        contactName,
        contactEmail,
        source,
        expectedStudents: expectedStudents ? Number(expectedStudents) : undefined,
        expectedMrr: expectedMrr ? Number(expectedMrr) : undefined,
      });
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
            <DialogTitle>New sales lead</DialogTitle>
            <DialogDescription>Capture prospective college or university details.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Organization name"><Input required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact name"><Input required value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
            <Field label="Contact email"><Input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
            <Field label="Lead source"><Input value={source} onChange={(e) => setSource(e.target.value)} /></Field>
            <Field label="Expected students"><Input type="number" min={0} value={expectedStudents} onChange={(e) => setExpectedStudents(e.target.value)} /></Field>
            <Field label="Expected MRR"><Input type="number" min={0} value={expectedMrr} onChange={(e) => setExpectedMrr(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Create lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailDialog({ lead, canManage, onClose }: { lead: SalesLead; canManage: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<SalesLead['stage']>(lead.stage);
  const [activityType, setActivityType] = useState('call');
  const [summary, setSummary] = useState('');
  const [err, setErr] = useState('');

  const updateMut = useOwnerMutation((nextStage: SalesLead['stage']) => ownerOperationsApi.updateLead(lead.id, { stage: nextStage }));
  const activityMut = useOwnerMutation(() => ownerOperationsApi.addLeadActivity(lead.id, { activityType, summary }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{lead.organizationName}</DialogTitle>
          <DialogDescription>
            {lead.contactName} · {lead.contactEmail}
          </DialogDescription>
        </DialogHeader>
        {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
        <div className="space-y-4 text-xs">
          {canManage ? (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Pipeline stage">
                <Select value={stage} onChange={(e) => setStage(e.target.value as SalesLead['stage'])}>
                  {LEAD_STAGES.map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </Field>
              <Button size="sm" onClick={() => void updateMut.mutateAsync(stage).then(onClose).catch((e) => setErr(errorMessage(e)))}>
                Save stage
              </Button>
            </div>
          ) : null}

          {canManage ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void activityMut.mutateAsync(undefined).then(() => { setSummary(''); onClose(); }).catch((caught) => setErr(errorMessage(caught)));
              }}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <p className="font-semibold">Log sales activity</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  <option value="call">Call</option>
                  <option value="demo">Product demo</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Internal note</option>
                </Select>
                <Input className="sm:col-span-2" required placeholder="Summary of conversation..." value={summary} onChange={(e) => setSummary(e.target.value)} />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={activityMut.isPending}>Add activity</Button>
            </form>
          ) : null}

          <div className="space-y-1.5">
            <p className="font-semibold">Recent activities</p>
            {lead.activities && lead.activities.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border px-3">
                {lead.activities.map((act) => (
                  <li key={act.id} className="py-2">
                    <span className="font-medium capitalize">{act.activityType}:</span> {act.summary}
                    <span className="block text-2xs text-muted-foreground">{act.actor ?? 'Owner'} · {formatDate(act.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No sales activities logged" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOnboardingDialog({ onClose }: { onClose: () => void }) {
  const [institutionName, setInstitutionName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [institutionType, setInstitutionType] = useState('college');
  const [state, setState] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createOnboarding);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({ institutionName, contactName, contactEmail, code: code || undefined, institutionType, state: state || undefined });
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
            <DialogTitle>Start tenant onboarding</DialogTitle>
            <DialogDescription>Opens a structured 9-stage checklist prior to provisioning.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Institution name"><Input required value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proposed code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Optional" /></Field>
            <Field label="Type">
              <Select value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="institute">Institute</option>
                <option value="school">School</option>
              </Select>
            </Field>
            <Field label="Primary contact name"><Input required value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
            <Field label="Primary contact email"><Input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
            <Field label="State"><Input value={state} onChange={(e) => setState(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Start pipeline</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingDetailDialog({
  item,
  canManage,
  onClose,
  onConverted,
}: {
  item: OnboardingItem;
  canManage: boolean;
  onClose: () => void;
  onConverted: (institutionId: number) => void;
}) {
  const [stage, setStage] = useState<OnboardingItem['stage']>(item.stage);
  const [status, setStatus] = useState<OnboardingItem['status']>(item.status);
  const [blockerReason, setBlockerReason] = useState(item.blockerReason ?? '');
  const [err, setErr] = useState('');

  const updateMut = useOwnerMutation(() =>
    ownerOperationsApi.updateOnboarding(item.id, { stage, status, blockerReason: status === 'blocked' ? blockerReason : undefined }),
  );
  const toggleMut = useOwnerMutation((checkId: number) => ownerOperationsApi.toggleChecklist(checkId));
  const convertMut = useOwnerMutation(() => ownerOperationsApi.convertOnboardingToInstitution(item.id, { code: item.code ?? undefined, status: 'trial' }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{item.institutionName}</DialogTitle>
          <DialogDescription>
            {item.contactName} ({item.contactEmail}) · {item.country}
          </DialogDescription>
        </DialogHeader>
        {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
        <div className="space-y-4 text-xs">
          {canManage ? (
            <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border p-3">
              <Field label="Onboarding stage">
                <Select value={stage} onChange={(e) => setStage(e.target.value as OnboardingItem['stage'])}>
                  {ONBOARDING_STAGES.map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as OnboardingItem['status'])}>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              {status === 'blocked' ? (
                <div className="sm:col-span-2">
                  <Field label="Blocker reason">
                    <Input value={blockerReason} onChange={(e) => setBlockerReason(e.target.value)} />
                  </Field>
                </div>
              ) : null}
              <div className="sm:col-span-2 flex justify-between pt-1">
                <Button size="sm" variant="outline" onClick={() => void updateMut.mutateAsync(undefined).then(onClose).catch((e) => setErr(errorMessage(e)))}>
                  Save stage &amp; status
                </Button>
                {!item.institution ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      void convertMut
                        .mutateAsync(undefined)
                        .then((res) => {
                          onClose();
                          onConverted(res.institutionId);
                        })
                        .catch((e) => setErr(errorMessage(e)))
                    }
                  >
                    Provision live institution
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="font-semibold">Onboarding checklist</p>
            {item.checklist.length === 0 ? <EmptyState title="No checklist tasks" /> : null}
            <ul className="divide-y divide-border rounded-lg border border-border">
              {item.checklist.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => void toggleMut.mutateAsync(task.id).then(onClose)}
                    className="flex items-center gap-2 text-left"
                  >
                    {task.isCompleted ? <CheckSquare size={15} className="text-emerald-600" /> : <Square size={15} className="text-muted-foreground" />}
                    <span className={task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}>{task.title}</span>
                  </button>
                  <Badge variant="secondary" className="text-2xs capitalize">{task.stage}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

