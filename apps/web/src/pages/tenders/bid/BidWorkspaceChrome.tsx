// Shared pieces for all three Bid Submission Workspace steps (ported from the
// "CPCL Bidder Portal - Bid Submission Workspace" Stitch screens): the tender
// context banner, the 3-step progress stepper and the sticky action bar.
// Sidebar/header come from the shared BidderPortalShell.

import type { ReactNode } from 'react';
import { Card, Icon, StatusBadge, Stepper, Tag } from '@/components/primitives';

export const BID_TENDER = {
  ref: 'CPCL/PROC/2026/041',
  title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
  authority: 'Chennai Petroleum Corporation Limited (Govt. of India Enterprise)',
  draftId: 'BID-DRAFT-2026-00418',
  deadline: '04 Oct 2026 · 17:00 IST',
  daysRemaining: '2 days remaining',
};

export type BidStepId = 1 | 2 | 3;

const STEPS = [
  { label: 'Basic details', description: 'Bidder identity & authorized contact' },
  { label: 'Documents', description: 'Technical envelope & statutory proofs' },
  { label: 'Review & e-sign', description: 'Declarations, DSC seal & submit' },
];

/** Tender identity strip shown at the top of every workspace step. */
export function TenderContextBanner({ tenderRef = BID_TENDER.ref }: { tenderRef?: string }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-card bg-navy text-white">
            <Icon name="shield_lock" size="xl" />
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-saffron" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Tag mono>{tenderRef}</Tag>
              <StatusBadge status="open" />
              <Tag mono>{BID_TENDER.draftId}</Tag>
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-snug text-on-surface">{BID_TENDER.title}</h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{BID_TENDER.authority}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 rounded-card border border-warning-border bg-warning-container px-4 py-3">
          <Icon name="alarm" size="xl" className="text-warning-on-container" />
          <div>
            <div className="text-[12px] font-medium text-warning-on-container/80">Submission deadline</div>
            <div className="text-[15px] font-semibold text-warning-on-container num">{BID_TENDER.deadline}</div>
            <div className="text-[12px] font-medium text-warning-on-container">{BID_TENDER.daysRemaining}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** 3-step guided-workflow stepper shared by all workspace steps. */
export function BidStepper({ current }: { current: BidStepId }) {
  return (
    <Card>
      <Stepper steps={STEPS} current={current} />
    </Card>
  );
}

/** Sticky bottom action bar for the workspace (clears the sidebar on ≥lg). */
export function BidActionBar({ left, center, right }: { left?: ReactNode; center?: ReactNode; right: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md lg:left-sidebar">
      <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">{left}</div>
        {center && <div className="hidden items-center lg:flex">{center}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2.5">{right}</div>
      </div>
    </div>
  );
}
