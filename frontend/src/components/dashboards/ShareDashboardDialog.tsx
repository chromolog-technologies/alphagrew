import { useEffect, useState } from 'react';
import { useShareDashboard, type Dashboard } from '../../api/dashboardsApi';
import { ApiError } from '../../api/http';
import { Alert, AlertDescription, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui';

const SHAREABLE_ROLES = [
  { value: 'institution_admin', label: 'Institution admins (management)' },
  { value: 'staff', label: 'All staff' },
  { value: 'placement_officer', label: 'Placement officers' },
  { value: 'student', label: 'Students' },
];

interface ShareDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboard: Dashboard;
  designations: { id: number; name: string }[];
}

/**
 * Share a dashboard read-only with roles and staff designations (for example "Head of
 * Department" or "Exam Coordinator"). Each viewer sees the same widgets over their own data.
 */
export function ShareDashboardDialog({ open, onOpenChange, dashboard, designations }: ShareDashboardDialogProps) {
  const share = useShareDashboard();
  const [roles, setRoles] = useState<string[]>(dashboard.sharing.roles);
  const [designationIds, setDesignationIds] = useState<number[]>(dashboard.sharing.designationIds);
  const [audienceDefault, setAudienceDefault] = useState(dashboard.sharing.audienceDefault);

  useEffect(() => {
    if (!open) return;
    setRoles(dashboard.sharing.roles);
    setDesignationIds(dashboard.sharing.designationIds);
    setAudienceDefault(dashboard.sharing.audienceDefault);
    share.reset();
  }, [open, dashboard]);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const sharedWithAnyone = roles.length > 0 || designationIds.length > 0;

  const submit = () => {
    if (dashboard.id === null) return;
    share.mutate(
      { id: dashboard.id, input: { roles, designationIds, audienceDefault: sharedWithAnyone && audienceDefault } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{dashboard.name}”</DialogTitle>
          <DialogDescription>
            People you share with can view and copy this dashboard but not change it. Everyone sees only the data their role allows.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Roles</legend>
          {SHAREABLE_ROLES.map((role) => (
            <label key={role.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={roles.includes(role.value)} onChange={() => setRoles((current) => toggle(current, role.value))} />
              {role.label}
            </label>
          ))}
        </fieldset>

        {designations.length ? (
          <fieldset className="mt-4 space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Staff designations</legend>
            <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {designations.map((designation) => (
                <label key={designation.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={designationIds.includes(designation.id)}
                    onChange={() => setDesignationIds((current) => toggle(current, designation.id))}
                  />
                  {designation.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <label className={`mt-4 flex items-start gap-2 text-sm ${sharedWithAnyone ? 'text-slate-700' : 'text-slate-400'}`}>
          <input type="checkbox" className="mt-0.5" disabled={!sharedWithAnyone} checked={sharedWithAnyone && audienceDefault} onChange={(event) => setAudienceDefault(event.target.checked)} />
          <span>
            Make this their default dashboard
            <span className="block text-xs text-slate-500">It opens first for these people unless they pick their own home dashboard.</span>
          </span>
        </label>

        {share.error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{share.error instanceof ApiError ? share.error.message : 'Sharing failed.'}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={share.isPending}>
            {share.isPending ? 'Saving…' : sharedWithAnyone ? 'Share' : 'Stop sharing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
