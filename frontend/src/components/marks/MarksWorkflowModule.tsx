import React, { useEffect, useState } from 'react';
import { marksApi, type Semester } from '../../api/marksApi';
import type { CampusPermission } from '../../campusTypes';
import { MarksEntryPanel } from './MarksEntryPanel';
import { MarksReviewPanel } from './MarksReviewPanel';
import { MarksSetupPanel } from './MarksSetupPanel';
import { ResultPublishingPanel } from './ResultPublishingPanel';
import { Notice, errorText } from './marksUi';

type Step = 'setup' | 'entry' | 'review' | 'publish';

interface MarksWorkflowModuleProps {
  permissions: CampusPermission[];
  /** False in offline demo mode: these screens read and write the Laravel API only. */
  apiConfigured: boolean;
}

const steps: { id: Step; label: string; detail: string; permission: CampusPermission }[] = [
  { id: 'setup', label: 'Set up', detail: 'Grade rules and mark schemes', permission: 'marks.view' },
  { id: 'entry', label: 'Enter marks', detail: 'Draft, then submit', permission: 'marks.create' },
  { id: 'review', label: 'Review', detail: 'Verify, approve or send back', permission: 'marks.view' },
  { id: 'publish', label: 'Publish', detail: 'Release and lock results', permission: 'marks.view' },
];

/**
 * Marks and results workflow from the Campus Academics addendum (A5), on the real API:
 * set up → enter (draft) → submit → verify → approve → publish (locked) → unlock with a reason.
 * Each step shows only for users holding its permission; actions inside a step check their own.
 */
export const MarksWorkflowModule: React.FC<MarksWorkflowModuleProps> = ({ permissions, apiConfigured }) => {
  const can = (permission: CampusPermission) => permissions.includes(permission);
  const visibleSteps = steps.filter((step) => can(step.permission));
  const [active, setActive] = useState<Step>(visibleSteps.find((step) => step.id === 'entry')?.id ?? visibleSteps[0]?.id ?? 'setup');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterId, setSemesterId] = useState<number | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiConfigured) return;
    marksApi
      .semesters()
      .then((loaded) => {
        setSemesters(loaded);
        if (loaded.length === 1) setSemesterId(loaded[0].id);
      })
      .catch((loadError) => setError(errorText(loadError, 'Unable to load semesters.')));
  }, [apiConfigured]);

  if (!apiConfigured) {
    return (
      <Notice>
        Marks and results run on the Laravel API: set <code>VITE_API_BASE_URL</code> and sign in with a demo account. The offline
        demo has no marks workflow.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0a2342]">Marks and results</h2>
        <p className="mt-1 text-sm text-[#4d6d8f]">
          Entries move from draft to submitted, verified, approved and published. A reviewer can send an entry back to draft.
        </p>
      </div>

      <nav aria-label="Marks workflow">
        <ol className="grid gap-2 sm:grid-cols-4">
          {visibleSteps.map((step, index) => {
            const selected = step.id === active;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setActive(step.id)}
                  aria-current={selected ? 'step' : undefined}
                  className={`flex h-full w-full items-start gap-3 rounded-[16px] border p-3 text-left transition ${
                    selected ? 'border-2 border-[#0b4d88] bg-[#f2f8fe]' : 'border-[#d5e4f2] bg-white hover:bg-[#f8fbff]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      selected ? 'bg-[#0b4d88] text-white' : 'bg-[#e6f1fb] text-[#0b4d88]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#0a2342]">{step.label}</span>
                    <span className="block text-xs text-[#4d6d8f]">{step.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {active === 'setup' ? (
        <MarksSetupPanel semesters={semesters} semesterId={semesterId} onSemesterChange={setSemesterId} canEdit={can('marks.create')} />
      ) : null}
      {active === 'entry' ? <MarksEntryPanel semesters={semesters} semesterId={semesterId} onSemesterChange={setSemesterId} /> : null}
      {active === 'review' ? <MarksReviewPanel canReview={can('marks.approve')} /> : null}
      {active === 'publish' ? (
        <ResultPublishingPanel semesters={semesters} semesterId={semesterId} onSemesterChange={setSemesterId} canPublish={can('marks.publish')} />
      ) : null}
    </div>
  );
};
