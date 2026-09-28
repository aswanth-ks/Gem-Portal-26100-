// Requirement Setup transition for the Create tender wizard: a lightweight
// choice modal shown over Tender Documents (O05).
//
// Both options are real. "AI-assisted setup" navigates to Step 3 with a flag
// that triggers the existing real Phase 3A analysis (POST
// .../documents/:id/analyze -> apps/ai -> Ollama) as soon as the page loads
// — there is no second AI implementation here, this modal only decides which
// mode Step 3 starts in. "Manual setup" opens the same Step 3 page without
// triggering analysis.

import { useNavigate } from 'react-router-dom';
import { Button, Icon, Modal, StatusBadge } from '@/components/primitives';
import { CREATE_TENDER_ROUTES } from './createTender';

function OptionCard({ icon, title, description, note, cta, onClick, badge }: { icon: string; title: string; description: string; note?: string; cta: string; onClick: () => void; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring group flex flex-col gap-3 rounded-card border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all hover:border-secondary/50 hover:shadow-card-hover"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-info-container text-secondary">
        <Icon name={icon} size="lg" />
      </span>
      <span className="flex items-center gap-2 text-[15px] font-semibold text-on-surface">
        {title}
        {badge && <StatusBadge tone="success">{badge}</StatusBadge>}
      </span>
      <span className="text-body-sm text-on-surface-variant">{description}</span>
      {note && (
        <span className="flex items-start gap-1.5 text-[12px] font-medium text-secondary">
          <Icon name="verified_user" size="xs" className="mt-0.5" />
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

export function RequirementSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

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
            icon="auto_awesome"
            title="AI-assisted setup"
            badge="Recommended"
            description="Analyze the uploaded tender documents and propose structured bidder requirements with source-page and clause evidence."
            note="AI proposes · Officer verifies"
            cta="Use AI-assisted setup"
            onClick={() => navigate(`${CREATE_TENDER_ROUTES.requirements}?ai=1`)}
          />
          <OptionCard icon="checklist" title="Manual setup" description="Define bidder requirements and conditions yourself." cta="Set up manually" onClick={() => navigate(CREATE_TENDER_ROUTES.requirements)} />
        </div>
      </div>
    </Modal>
  );
}
