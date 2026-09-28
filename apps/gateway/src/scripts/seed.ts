// Seeds the 4 canonical tenders the officer-side prototype already shows
// (content mirrors apps/web/src/pages/officer/tenders/TenderViewPage.tsx's
// SCOPES, and the same 4 refs from apps/web/src/pages/officer/bids/
// assessmentData.ts) so the real bidder flow has something real to browse
// and bid on, even though officer tender creation isn't wired to this
// backend yet (out of scope this phase).
//
// Deadlines are set to real near-future dates from the moment this script
// runs — not the prototype's fictional 2026 dates — because this backend
// enforces the deadline against the real server clock. One tender gets a
// short deadline so "submission closed / bid now immutable" is actually
// observable without waiting.
//
// CPCL/PROC/2026/037 exists as two different things in the officer mock
// data (a draft in one file, a published tender in another). This seed
// uses the published version from assessmentData.ts as the one canonical
// record — see the Phase-1 report for why.
//
// Run: npm run seed --workspace=apps/gateway

import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { Tender } from '../models/Tender.js';
import { User } from '../models/User.js';
import { BidderProfile } from '../models/BidderProfile.js';
import { TenderRequirement } from '../models/TenderRequirement.js';
import { ComplianceRule } from '../models/ComplianceRule.js';
import mongoose from 'mongoose';

const now = Date.now();
const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);
const minutes = (n: number) => new Date(now + n * 60 * 1000);

const TENDERS = [
  {
    tenderNumber: 'CPCL/PROC/2026/041',
    title: 'Supply of CCTV Cameras for Public Safety Infrastructure',
    department: 'Refinery Unit-I Security Wing · Manali Refinery',
    description: 'Supply, installation, testing and commissioning of an IP-based CCTV surveillance system across Refinery Unit-I perimeter and process areas, with a 3-year comprehensive maintenance contract.',
    scopeOfWork: ['140 Nos. 4K PTZ weatherproof IP cameras (ONVIF Profile S/G/T)', '64-channel NVR with 45-day recording retention', 'Control room VMS integration and operator training', '3-year comprehensive annual maintenance contract'],
    technicalRequirements: ['Camera resolution ≥ 4K, IP67 ingress rating', 'IR night vision, ONVIF-compliant', 'Storage retention ≥ 30 days', 'Warranty ≥ 3 years comprehensive'],
    eligibilityCriteria: ['Average annual turnover ≥ ₹50 Lakhs (last 3 financial years)', 'Completed one similar CCTV/surveillance work ≥ ₹34 Lakh in the last 7 years', 'Valid OEM authorization for quoted camera and NVR models'],
    requiredDocuments: ['PAN certificate', 'GST registration certificate', 'Audited financial statements (3 years)', 'OEM authorization letter', 'Experience/completion certificates', 'Technical compliance statement'],
    value: '₹ 42,50,000 (excl. GST)',
    submissionStart: days(0),
    submissionDeadline: days(21),
    status: 'published' as const,
  },
  {
    tenderNumber: 'CPCL/PROC/2026/039',
    title: 'Industrial Network Security Equipment',
    department: 'Central OT Security Cell · Manali Refinery',
    description: "Supply and deployment of next-generation firewalls and intrusion prevention systems across the refinery's OT/IT network boundary, under a limited expression of interest.",
    scopeOfWork: ['Next-gen firewall pairs at 4 OT/IT boundary points', 'Centralized IPS management console', 'Network segmentation as per IEC 62443 zones/conduits'],
    technicalRequirements: ['Firewall throughput ≥ 10 Gbps', 'IEC 62443-4-2 certified appliances', 'Redundant HA pair per site'],
    eligibilityCriteria: ['Empanelled OEM partner status', 'Prior OT security deployment in a process industry'],
    requiredDocuments: ['PAN & GST certificates', 'OEM partner certificate', 'Past deployment references'],
    value: '₹ 28,00,000 (excl. GST)',
    submissionStart: days(0),
    submissionDeadline: days(14),
    status: 'published' as const,
  },
  {
    // Canonical version — the published, real one (see file header).
    tenderNumber: 'CPCL/PROC/2026/037',
    title: 'Control Room Display Systems',
    department: 'Refinery-II Central DCS',
    description: 'Supply, installation and commissioning of a control room video wall matrix and operator display consoles for Refinery-II Central DCS.',
    scopeOfWork: ['9-screen video wall with matrix switcher', 'Operator console furniture and cabling', 'Integration with existing DCS/SCADA feeds'],
    technicalRequirements: ['55" 4K narrow-bezel displays', 'Redundant matrix switcher', 'Uptime SLA 99.9%'],
    eligibilityCriteria: ['Turnkey control-room integration experience', 'Local service presence in Tamil Nadu'],
    requiredDocuments: ['PAN & GST certificates', 'Experience certificates', 'Technical compliance statement'],
    value: '₹ 61,00,000 (excl. GST)',
    submissionStart: days(0),
    submissionDeadline: days(30),
    status: 'published' as const,
  },
  {
    tenderNumber: 'CPCL/PROC/2026/035',
    title: 'Industrial Safety Monitoring & Gas Detection Sensor Array',
    department: 'Crude Distillation Unit (CDU)',
    description: 'Supply and installation of a gas detection sensor array and safety monitoring system across the Crude Distillation Unit, under a global tender (ICB).',
    scopeOfWork: ['48 Nos. fixed gas detectors (H2S, LEL, CO)', 'Central safety monitoring panel with SIL-2 rating', 'Cabling and hazardous-area installation'],
    technicalRequirements: ['SIL-2 certified detection loop', 'ATEX/IECEx certified field devices', 'Integration with plant ESD system'],
    eligibilityCriteria: ['SIL-2 system integration experience', 'ATEX-certified equipment supply record'],
    requiredDocuments: ['PAN & GST certificates', 'SIL-2 competency certificate', 'ATEX/IECEx certificates for offered devices'],
    value: '₹ 74,20,000 (excl. GST)',
    // Short fuse on purpose: lets "submission closed / bid immutable" be demonstrated a few minutes after seeding.
    submissionStart: days(0),
    submissionDeadline: minutes(3),
    status: 'published' as const,
  },
];

async function main() {
  await connectDb();

  let tender041: InstanceType<typeof Tender> | null = null;
  for (const t of TENDERS) {
    const doc = await Tender.findOneAndUpdate({ tenderNumber: t.tenderNumber }, { ...t, publishedAt: new Date(), createdBy: 'seed' }, { upsert: true, new: true, setDefaultsOnInsert: true });
    if (t.tenderNumber === 'CPCL/PROC/2026/041') tender041 = doc;
    console.log(`[seed] upserted ${t.tenderNumber} — deadline ${t.submissionDeadline.toISOString()}`);
  }

  // Phase 2 (officer persistence foundation): one explicit demo requirement +
  // rule for the canonical tender, seeded as demo configuration — NOT
  // AI-generated (no AI extraction exists yet). Upserted on {tenderId, code}
  // so re-running the seed never duplicates it.
  if (tender041) {
    const req = await TenderRequirement.findOneAndUpdate(
      { tenderId: tender041._id, code: 'REQ-001' },
      {
        tenderId: tender041._id,
        code: 'REQ-001',
        title: 'Average Annual Turnover',
        description: 'Average annual turnover must be at least ₹50 lakh over the last 3 financial years.',
        category: 'financial',
        mandatory: true,
        conditional: false,
        evidenceTypes: ['CA Certificate', 'ITR'],
        sourceDocument: 'Tender_041.pdf',
        sourcePage: 7,
        sourceClause: '4.2',
        status: 'approved',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await ComplianceRule.findOneAndUpdate(
      { tenderId: tender041._id, requirementId: req._id, field: 'average_annual_turnover' },
      {
        tenderId: tender041._id,
        requirementId: req._id,
        type: 'numeric_threshold',
        field: 'average_annual_turnover',
        operator: '>=',
        value: 5000000,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log('[seed] upserted demo requirement REQ-001 + compliance rule for CPCL/PROC/2026/041');
  }

  const demoEmail = 'demo.bidder@example.com';
  let demoUser = await User.findOne({ email: demoEmail });
  if (!demoUser) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    demoUser = await User.create({ email: demoEmail, passwordHash, role: 'bidder' });
    await BidderProfile.create({
      userId: demoUser._id,
      organizationName: 'ABC Engineering Pvt Ltd',
      registrationNumber: 'U74999TN2011PTC012345',
      contactPerson: 'Arjun Menon',
      email: demoEmail,
      phone: '+91 98765 43210',
      address: 'Guindy Industrial Estate, Chennai 600032',
    });
    console.log(`[seed] created demo bidder ${demoEmail} / Password123!`);
  } else {
    console.log(`[seed] demo bidder ${demoEmail} already exists`);
  }

  await mongoose.disconnect();
  console.log('[seed] done.');
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
