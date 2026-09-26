// Requirement Setup transition for the Create tender wizard: a lightweight
// choice modal shown over Tender Documents (O05). "AI-assisted" shows a
// compact analysis state, then opens O07 with suggested requirements;
// "Manual" opens O07 with an empty editable list.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Modal } from '@/components/primitives';
import { CREATE_TENDER_ROUTES } from './createTender';

const ANALYSIS_STEPS = ['Reading uploaded documents', 'Locating eligibility & qualification clauses', 'Drafting proposed requirements'];

function OptionCard({ icon, title, description, note, cta, onClick }: { icon: string; title: string; description: string; note?: string; cta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring group flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all hover:border-secondary/50 hover:shadow-card-hover"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-info-container text-secondary">
        <Icon name={icon} size="lg" />
      </span>
      <span className="text-[15px] font-semibold text-on-surface">{title}</span>
      <span className="text-body-sm text-on-surface-variant">{description}</span>
      {note && (
        <span className="flex items-start gap-1.5 text-[12px] text-on-surface-variant">
          <Icon name="verified_user" size="xs" className="mt-0.5 text-outline" />
          {note}
        </span>
      )}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[14px] font-semibold text-secondary">
        {cta}
        <Icon name="arrow_forward" size="sm" className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export function RequirementSetupModal({ open, onClose, documentCount }: { open: boolean; onClose: () => void; documentCount: number }) {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!analyzing) return;
    if (progress >= ANALYSIS_STEPS.length) {
      const t = setTimeout(() => navigate(`${CREATE_TENDER_ROUTES.requirements}?mode=ai`), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => p + 1), 800);
    return () => clearTimeout(t);
  }, [analyzing, progress, navigate]);

  if (analyzing) {
    return (
      <Modal open onClose={() => undefined} icon="document_scanner" size="md" title="Analyzing tender documents…" description={`${documentCount} source ${documentCount === 1 ? 'document' : 'documents'} · proposals need your approval`}>
        <ul className="flex flex-col gap-3" aria-live="polite">
          {ANALYSIS_STEPS.map((s, i) => {
            const done = i < progress;
            const active = i === progress;
            return (
              <li key={s} className="flex items-center gap-3 text-[14px]">
                {done ? (
                  <Icon name="check_circle" size="md" fill className="text-success" />
                ) : active ? (
                  <Icon name="progress_activity" size="md" spin className="text-secondary" />
                ) : (
                  <Icon name="radio_button_unchecked" size="md" className="text-outline" />
                )}
                <span className={done || active ? 'text-on-surface' : 'text-on-surface-variant'}>{s}</span>
              </li>
            );
          })}
        </ul>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="rule"
      title="Set up requirements"
      description="How would you like to define the bidder requirements for this tender?"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionCard
            icon="document_scanner"
            title="AI-assisted setup"
            description="Analyze the uploaded tender documents and generate proposed bidder requirements."
            note="Requirements will remain editable and require officer approval."
            cta="Use AI-assisted setup"
            onClick={() => {
              setProgress(0);
              setAnalyzing(true);
            }}
          />
          <OptionCard
            icon="checklist"
            title="Manual setup"
            description="Define bidder requirements and conditions manually."
            cta="Set up manually"
            onClick={() => navigate(`${CREATE_TENDER_ROUTES.requirements}?mode=manual`)}
          />
        </div>
        <p className="flex items-start gap-2 rounded-control bg-surface-container-low px-3.5 py-2.5 text-[13px] text-on-surface-variant">
          <Icon name="info" size="sm" className="mt-0.5 shrink-0 text-outline" />
          AI provides recommendations only. The Procurement Officer controls the final requirements.
        </p>
      </div>
    </Modal>
  );
}
