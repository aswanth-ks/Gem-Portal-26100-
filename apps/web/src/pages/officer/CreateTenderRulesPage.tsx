// Procurement Officer — Create Tender, Step 4: Rules & Compliance. Defines
// how bids are evaluated (technical qualification, financial method,
// tie-break) and which statutory policies apply (MSE / Make in India
// preference, Integrity Pact, reverse auction). Same header, stepper, section
// cards and action bar as Steps 1–3.
//
// TODO: persist rules to /api/officer/tenders/drafts/:ref/rules.

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { OfficerPortalShell } from '@/layouts/OfficerPortalShell';
import { BidActionBar } from '@/pages/tenders/bid/BidWorkspaceChrome';
import { Button, Callout, Card, CardHeader, Field, Input, PageHeader, Select, StatusBadge, Stepper, Tag } from '@/components/primitives';
import { CREATE_TENDER_ROUTES, CREATE_TENDER_STEPS, DRAFT_REF } from './createTender';
import { YesNo } from './CreateTenderInfoPage';

function Section({ index, icon, title, description, badge, children }: { index: number; icon: string; title: string; description: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card padding="lg" as="section">
      <CardHeader icon={icon} title={`${index}. ${title}`} description={description} actions={badge} />
      {children}
    </Card>
  );
}

function ToggleRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[14px] font-semibold text-on-surface">{title}</div>
        <div className="text-body-sm text-on-surface-variant">{description}</div>
      </div>
      <YesNo label={title} value={value} onChange={onChange} />
    </div>
  );
}

export function CreateTenderRulesPage() {
  const navigate = useNavigate();
  const [passMark, setPassMark] = useState('70');
  const [method, setMethod] = useState('l1');
  const [mse, setMse] = useState(true);
  const [mii, setMii] = useState(true);
  const [pact, setPact] = useState(true);
  const [auction, setAuction] = useState(false);
  const [clarify, setClarify] = useState(true);
  const [preBid, setPreBid] = useState(true);

  const mark = Number(passMark);
  const markOk = passMark !== '' && mark >= 50 && mark <= 100;
  const qcbs = method === 'qcbs';

  return (
    <OfficerPortalShell breadcrumb="Create tender">
      <div className="flex flex-col gap-8 pb-28">
        <PageHeader
          breadcrumbs={[
            { label: 'Officer workspace', to: '/officer/dashboard' },
            { label: 'Tenders', to: '/officer/tenders' },
            { label: `Create tender (${DRAFT_REF})`, to: CREATE_TENDER_ROUTES.info },
            { label: 'Rules & compliance' },
          ]}
          eyebrow={
            <>
              <StatusBadge tone="neutral">Draft</StatusBadge>
              <Tag mono>{DRAFT_REF}</Tag>
            </>
          }
          title="Rules & compliance"
          description="Set how bids will be evaluated and which statutory policies apply. These rules are locked once the tender is published."
        />

        <Card padding="lg">
          <Stepper steps={CREATE_TENDER_STEPS} current={4} />
        </Card>

        {/* 1. Technical evaluation */}
        <Section index={1} icon="engineering" title="Technical evaluation" description="How bidders qualify on the technical cover before financial bids are opened." badge={<Tag>Cover 1</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Qualification basis" htmlFor="rl-basis" required>
              <Select id="rl-basis" defaultValue="pass_fail">
                <option value="pass_fail">Pass / fail against requirements</option>
                <option value="scored">Scored (points out of 100)</option>
              </Select>
            </Field>
            <Field label="Minimum technical score" htmlFor="rl-mark" required helper="Between 50 and 100" error={!markOk ? 'Enter a value between 50 and 100' : undefined}>
              <Input id="rl-mark" inputMode="numeric" className="num" value={passMark} state={markOk ? 'default' : 'error'} onChange={(e) => setPassMark(e.target.value.replace(/\D/g, '').slice(0, 3))} rightSlot={<span className="pr-2 text-[13px] text-on-surface-variant">/100</span>} />
            </Field>
            <Field label="Requirements applied" htmlFor="rl-req" helper="From Step 3">
              <Input id="rl-req" value="7 requirements (5 mandatory)" disabled readOnly rightIcon="lock" />
            </Field>
          </div>
          <div className="mt-5 divide-y divide-outline-variant rounded-card border border-outline-variant">
            <ToggleRow title="Allow clarification requests" description="Committee may seek clarifications on submitted documents (no new documents)" value={clarify} onChange={setClarify} />
            <ToggleRow title="Hold pre-bid meeting" description="Scheduled 7 days after issue; minutes published as a corrigendum" value={preBid} onChange={setPreBid} />
          </div>
        </Section>

        {/* 2. Financial evaluation */}
        <Section index={2} icon="payments" title="Financial evaluation" description="How technically qualified bids are ranked and awarded." badge={<Tag>Cover 2</Tag>}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Evaluation method" htmlFor="rl-method" required>
              <Select id="rl-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="l1">Lowest price (L1), overall</option>
                <option value="l1_item">Lowest price (L1), item-wise</option>
                <option value="qcbs">QCBS · quality & cost (80:20)</option>
              </Select>
            </Field>
            <Field label="Price basis" htmlFor="rl-price" required>
              <Select id="rl-price" defaultValue="landed">
                <option value="landed">Total landed cost incl. GST</option>
                <option value="exgst">Price excluding GST</option>
              </Select>
            </Field>
            <Field label="Tie-break rule" htmlFor="rl-tie" required>
              <Select id="rl-tie" defaultValue="tech">
                <option value="tech">Higher technical score wins</option>
                <option value="mse">MSE bidder preferred</option>
                <option value="lottery">Draw of lots (committee)</option>
              </Select>
            </Field>
          </div>
          {qcbs && (
            <Callout tone="info" icon="info" className="mt-5">
              QCBS combines technical score (80%) and normalised price (20%). Ensure Step 3 requirements carry scoring weights.
            </Callout>
          )}
          <div className="mt-5 divide-y divide-outline-variant rounded-card border border-outline-variant">
            <ToggleRow title="Conduct reverse auction" description="L1 discovery through an online reverse auction among qualified bidders" value={auction} onChange={setAuction} />
          </div>
        </Section>

        {/* 3. Policies */}
        <Section index={3} icon="policy" title="Statutory policies" description="Government purchase preferences and integrity obligations." badge={<StatusBadge tone="success">GFR 2017 · CVC 2024</StatusBadge>}>
          <div className="divide-y divide-outline-variant rounded-card border border-outline-variant">
            <ToggleRow title="MSE purchase preference" description="Public Procurement Policy for MSEs, 2012 — MSEs within L1 + 15% may match L1 for up to 25% of quantity" value={mse} onChange={setMse} />
            <ToggleRow title="Make in India preference" description="PPP-MII Order 2017 — Class-I local suppliers within 20% margin get purchase preference" value={mii} onChange={setMii} />
            <ToggleRow title="Integrity Pact" description="Mandatory above ₹ 25 Lakh; monitored by Independent External Monitors" value={pact} onChange={setPact} />
          </div>
          {!pact && (
            <Callout tone="warning" icon="warning" className="mt-5">
              This tender's value (₹ 42.5 Lakh) is above the Integrity Pact threshold. Disabling it needs a recorded justification.
            </Callout>
          )}
        </Section>
      </div>

      <BidActionBar
        left={
          <>
            <Button variant="secondary" leftIcon="arrow_back" to={`${CREATE_TENDER_ROUTES.requirements}?mode=ai`}>
              Back
            </Button>
            <Button variant="ghost" leftIcon="save" onClick={() => navigate('/officer/tenders')}>
              Save draft & exit
            </Button>
          </>
        }
        center={<span className="text-body-sm text-on-surface-variant">{markOk ? 'All evaluation rules valid' : 'Fix the technical score to continue'}</span>}
        right={
          <Button rightIcon="arrow_forward" disabled={!markOk} onClick={() => navigate(CREATE_TENDER_ROUTES.review)}>
            Continue to review
          </Button>
        }
      />
    </OfficerPortalShell>
  );
}
