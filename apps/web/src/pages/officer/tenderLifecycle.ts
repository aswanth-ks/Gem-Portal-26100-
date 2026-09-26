// Tender lifecycle: Draft → Published & Locked → Bidding Open → Deadline
// Passed → Bid Vault Open → Assessment Open.
//
// The submission deadline is the single source of truth for whether a
// tender's bid vault is sealed. Nothing sets "sealed"/"open" as an
// independent flag — every page that needs to know derives it from the
// tender's deadline via `isSealed()`, so the transition happens by itself
// once the deadline passes rather than needing an officer to flip a switch.
//
// SIMULATED_NOW stands in for "the current moment" across this prototype's
// mock data (there is no live clock feed here) — moving it forward is
// exactly equivalent to time passing. It is NOT read from the browser/host
// clock: this environment's host clock is unrelated to the fictional
// 2026 procurement calendar used throughout the demo data, so comparing
// against the real Date.now() would make every deadline look "in the future"
// regardless of what the UI is meant to demonstrate.
export const SIMULATED_NOW = new Date(2026, 9, 5, 9, 0); // 05 Oct 2026, 09:00

/** True while the submission window is still open — the bid vault is sealed. */
export function isSealed(deadlineISO: string): boolean {
  return SIMULATED_NOW.getTime() < new Date(deadlineISO).getTime();
}

export type SubmissionStatus = 'open' | 'closed';

export function submissionStatus(deadlineISO: string): SubmissionStatus {
  return isSealed(deadlineISO) ? 'open' : 'closed';
}

export function formatDeadline(deadlineISO: string): string {
  return new Date(deadlineISO).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}
