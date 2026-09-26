// Compact "Analyzing tender documents…" state shown when the officer leaves
// Tender Documents. The system extracts bidder requirements and evaluation
// rules, then opens Compliance Configuration for officer review.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Modal } from '@/components/primitives';
import { CREATE_TENDER_ROUTES } from './createTender';

const ANALYSIS_STEPS = ['Reading uploaded documents', 'Identifying bidder requirements', 'Structuring technical & financial rules', 'Linking each item to its source page'];

export function DocumentAnalysisModal({ open, documentCount }: { open: boolean; documentCount: number }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    if (progress >= ANALYSIS_STEPS.length) {
      const t = setTimeout(() => navigate(CREATE_TENDER_ROUTES.compliance), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => p + 1), 700);
    return () => clearTimeout(t);
  }, [open, progress, navigate]);

  return (
    <Modal
      open={open}
      onClose={() => undefined}
      icon="document_scanner"
      size="md"
      title="Analyzing tender documents…"
      description={`${documentCount} source ${documentCount === 1 ? 'document' : 'documents'} · results need your review`}
    >
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
