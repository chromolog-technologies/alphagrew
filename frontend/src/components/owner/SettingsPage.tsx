/** Global platform defaults, security policy, and maintenance mode (SRS FR-GS). */
import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import { ownerApi, OWNER, useOwnerMutation, usePlatformSettings, type PlatformSettings } from '../../api/ownerApi';
import { ErrorState, errorMessage, Field, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function SettingsPage({ can, go }: OwnerPageProps) {
  const settings = usePlatformSettings();
  const save = useOwnerMutation((input: Partial<PlatformSettings>) => ownerApi.saveSettings(input));
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [bypassText, setBypassText] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    if (settings.data && !form) {
      setForm(settings.data);
      setBypassText((settings.data.maintenanceBypassIps ?? []).join(', '));
    }
  }, [settings.data, form]);

  const canManage = can(OWNER.settingsManage);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSavedNotice('');
    const maintenanceBypassIps = bypassText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = await save.mutateAsync({ ...form, maintenanceBypassIps });
    setForm(updated);
    setBypassText((updated.maintenanceBypassIps ?? []).join(', '));
    setSavedNotice('Platform settings saved.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Global platform settings"
        description="Defaults for newly onboarded institutions, branding, session policy, and maintenance mode."
        actions={
          <Button size="sm" variant="outline" onClick={() => go('institutions')}>
            Institution overrides
          </Button>
        }
      />

      {settings.isPending ? <LoadingRows rows={5} /> : null}
      {settings.isError ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : null}

      {save.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{errorMessage(save.error)}</AlertDescription>
        </Alert>
      ) : null}

      {savedNotice ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription className="text-xs font-medium">{savedNotice}</AlertDescription>
        </Alert>
      ) : null}

      {form ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform defaults &amp; branding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform name" htmlFor="set-platform-name">
                <Input id="set-platform-name" value={form.platformName} disabled={!canManage} onChange={(e) => setForm({ ...form, platformName: e.target.value })} />
              </Field>
              <Field label="Brand tagline" htmlFor="set-brand-tagline">
                <Input id="set-brand-tagline" value={form.brandTagline ?? ''} disabled={!canManage} onChange={(e) => setForm({ ...form, brandTagline: e.target.value || null })} />
              </Field>
              <Field label="Brand primary color" htmlFor="set-brand-color">
                <div className="flex items-center gap-2">
                  <Input id="set-brand-color" value={form.brandPrimaryColor ?? '#1557e0'} disabled={!canManage} onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })} />
                  <input
                    type="color"
                    aria-label="Color picker"
                    disabled={!canManage}
                    value={/^#[0-9a-fA-F]{6}$/.test(form.brandPrimaryColor ?? '') ? form.brandPrimaryColor : '#1557e0'}
                    onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                </div>
              </Field>
              <Field label="Support email" htmlFor="set-support-email">
                <Input id="set-support-email" type="email" value={form.supportEmail ?? ''} disabled={!canManage} onChange={(e) => setForm({ ...form, supportEmail: e.target.value || null })} />
              </Field>
              <Field label="Support phone" htmlFor="set-support-phone">
                <Input id="set-support-phone" value={form.supportPhone ?? ''} disabled={!canManage} onChange={(e) => setForm({ ...form, supportPhone: e.target.value || null })} />
              </Field>
              <Field label="Default timezone" htmlFor="set-timezone">
                <Input id="set-timezone" value={form.defaultTimezone} disabled={!canManage} onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })} />
              </Field>
              <Field label="Default language" htmlFor="set-language">
                <Input id="set-language" maxLength={10} value={form.defaultLanguage ?? 'en'} disabled={!canManage} onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })} />
              </Field>
              <Field label="Date format" htmlFor="set-date-format">
                <Select id="set-date-format" value={form.dateFormat} disabled={!canManage} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}>
                  <option value="DD MMM YYYY">DD MMM YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </Select>
              </Field>
              <Field label="Default trial days" htmlFor="set-trial-days">
                <Input id="set-trial-days" type="number" min={0} max={365} value={form.defaultTrialDays} disabled={!canManage} onChange={(e) => setForm({ ...form, defaultTrialDays: Number(e.target.value) })} />
              </Field>
              <Field label="Currency (ISO 4217)" htmlFor="set-currency">
                <Input id="set-currency" maxLength={3} value={form.currency} disabled={!canManage} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Default billing tax code" htmlFor="set-tax-code">
                <Input id="set-tax-code" value={form.billingDefaultTaxCode ?? ''} disabled={!canManage} onChange={(e) => setForm({ ...form, billingDefaultTaxCode: e.target.value || null })} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security &amp; maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Minimum password length" htmlFor="set-pw-len">
                  <Input id="set-pw-len" type="number" min={8} max={64} value={form.passwordMinLength} disabled={!canManage} onChange={(e) => setForm({ ...form, passwordMinLength: Number(e.target.value) })} />
                </Field>
                <Field label="Session timeout (minutes)" htmlFor="set-session-timeout">
                  <Input
                    id="set-session-timeout"
                    type="number"
                    min={5}
                    max={43200}
                    value={form.sessionTimeoutMinutes ?? 120}
                    disabled={!canManage}
                    onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max upload size (MB)" htmlFor="set-upload-mb">
                  <Input id="set-upload-mb" type="number" min={1} max={100} value={form.maxUploadMb} disabled={!canManage} onChange={(e) => setForm({ ...form, maxUploadMb: Number(e.target.value) })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={form.mfaRequiredForPlatformStaff}
                  onChange={(e) => setForm({ ...form, mfaRequiredForPlatformStaff: e.target.checked })}
                />
                <span>Require two-step verification (TOTP MFA) for all platform operators</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={form.maintenanceEnabled}
                  onChange={(e) => setForm({ ...form, maintenanceEnabled: e.target.checked })}
                />
                <span>Enable maintenance mode for campus workspaces (platform operators keep access)</span>
              </label>
              <Field label="Maintenance notice" htmlFor="set-maint-msg">
                <Input id="set-maint-msg" value={form.maintenanceMessage} disabled={!canManage} onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })} />
              </Field>
              <Field label="Maintenance bypass IPs (comma-separated)" htmlFor="set-maint-ips">
                <Input
                  id="set-maint-ips"
                  placeholder="127.0.0.1, 10.0.0.1"
                  value={bypassText}
                  disabled={!canManage}
                  onChange={(e) => setBypassText(e.target.value)}
                />
              </Field>
              {canManage ? (
                <Button type="submit" disabled={save.isPending}>
                  <Save size={14} /> {save.isPending ? 'Saving...' : 'Save global settings'}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}

