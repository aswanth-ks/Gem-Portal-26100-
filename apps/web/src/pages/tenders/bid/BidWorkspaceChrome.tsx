// Shared pieces used by all three Bid Submission Workspace steps — ported
// from the "CPCL Bidder Portal - Bid Submission Workspace" Stitch screens
// (Step 01: Basic Details, Step 02: Documents, Step 03: Review & Confirm).
// Extracted here (rather than tripled across the three step pages) so the
// tender context banner and 3-step progress stepper render identically,
// consistent with keeping one shared visual language across the app.
//
// NOTE: the sidebar/header chrome for these screens comes from the shared
// BidderPortalShell layout, not from this file or the Stitch screens' own
// (yet another, slightly different) bespoke sidebar markup — see
// layouts/BidderPortalShell.tsx.

export const BID_TENDER = {
  ref: 'CPCL/PROC/2026/041',
  title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
  authority: 'Chennai Petroleum Corporation Limited (Govt. of India Enterprise)',
  draftId: 'BID-DRAFT-2026-00418',
  deadline: '04 Oct 2026 · 17:00 IST',
  daysRemaining: '2 Days Remaining',
};

export type BidStepId = 1 | 2 | 3;

const STEPS: { id: BidStepId; label: string; sub: string }[] = [
  { id: 1, label: 'Basic Details', sub: 'Bidder identity & authorized contacts' },
  { id: 2, label: 'Documents', sub: 'Technical envelope & fee proof' },
  { id: 3, label: 'Confirm & e-Sign', sub: 'DSC Class-3 digital seal & lock' },
];

/** Tender identity strip shown at the top of every workspace step. */
export function TenderContextBanner() {
  return (
    <div className="w-full bg-surface-container-low rounded-xl p-space-md mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-sm">
      <div className="flex items-center gap-space-md min-w-0">
        <div className="w-11 h-11 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-headline-sm shrink-0">
          <span className="material-symbols-outlined text-[24px] text-secondary-fixed">shield_lock</span>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">Tender Ref</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{BID_TENDER.ref}</span>
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">OPEN</span>
          </div>
          <div className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">{BID_TENDER.title}</div>
          <div className="font-body-sm text-body-sm text-on-surface-variant">{BID_TENDER.authority}</div>
        </div>
      </div>
      <div className="flex items-center gap-space-md shrink-0 bg-surface-container-lowest p-space-sm rounded-lg shadow-sm">
        <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low rounded-md">
          <span className="material-symbols-outlined text-[18px] text-on-tertiary-container">schedule</span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Submission Deadline</span>
            <span className="font-label-md text-label-md text-on-surface font-bold">{BID_TENDER.deadline}</span>
          </div>
        </div>
        <div className="h-8 w-px bg-outline-variant/30 hidden sm:block"></div>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>{BID_TENDER.daysRemaining}</span>
        </div>
      </div>
    </div>
  );
}

/** 3-step horizontal progress stepper shared by all workspace steps. */
export function BidStepper({ current }: { current: BidStepId }) {
  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-md mb-space-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
        {STEPS.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <div
              key={step.id}
              className={
                'flex items-center gap-space-sm p-space-sm rounded-lg ' +
                (active ? 'bg-surface-container-low' : done ? '' : 'opacity-60')
              }
            >
              <div
                className={
                  'w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md font-bold shrink-0 ' +
                  (active
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : done
                      ? 'bg-surface-container text-secondary'
                      : 'bg-surface-container-highest text-on-surface-variant')
                }
              >
                {done ? <span className="material-symbols-outlined text-[18px]">check</span> : String(step.id).padStart(2, '0')}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs">
                  <span className={'font-label-md text-label-md font-bold ' + (active ? 'text-secondary' : done ? 'text-secondary' : 'text-on-surface')}>
                    Step {step.id}: {step.label}
                  </span>
                  {active && (
                    <span className="px-space-xs py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold">Active</span>
                  )}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{step.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
