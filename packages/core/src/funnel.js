// Hiring funnel analytics derived from the contacts table.
// Contacts store the current stage and its date, so these metrics are a
// pragmatic pipeline read rather than a full historical stage-transition model.
import { STATUSES, isDue, parseDDMMYYYY } from "./contacts.js";

const ACTIVE_STATUSES = STATUSES.filter((status) => status !== "Rejected");
const STATUS_INDEX = Object.fromEntries(STATUSES.map((status, index) => [status, index]));

const round1 = (value) => Math.round(value * 10) / 10;
const rate = (numerator, denominator) => (denominator > 0 ? numerator / denominator : 0);

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isWithinDays(ddmmyyyy, days, now) {
  const date = parseDDMMYYYY(ddmmyyyy);
  if (!date) return false;
  const elapsed = startOfDay(now).getTime() - startOfDay(date).getTime();
  return elapsed >= 0 && elapsed <= days * 24 * 60 * 60 * 1000;
}

function hasReached(contact, stage) {
  if (contact.status === "Rejected") return false;
  return (STATUS_INDEX[contact.status] ?? 0) >= STATUS_INDEX[stage];
}

/**
 * @param {Array<{ status?: string, date?: string, nextAction?: string, nextActionDate?: string }>} contacts
 * @param {Date} [now]
 */
export function buildFunnelSummary(contacts = [], now = new Date()) {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const contact of contacts) {
    counts[contact.status] = (counts[contact.status] ?? 0) + 1;
  }

  const active = contacts.filter((contact) => contact.status !== "Rejected");
  const reached = {
    Contacted: active.length,
    Applied: active.filter((contact) => hasReached(contact, "Applied")).length,
    Interviewing: active.filter((contact) => hasReached(contact, "Interviewing")).length,
    Offer: active.filter((contact) => hasReached(contact, "Offer")).length,
  };

  const rates = {
    contactedToApplied: rate(reached.Applied, reached.Contacted),
    appliedToInterviewing: rate(reached.Interviewing, reached.Applied),
    interviewingToOffer: rate(reached.Offer, reached.Interviewing),
  };

  const recentApplied = active.filter((contact) => hasReached(contact, "Applied") && isWithinDays(contact.date, 28, now)).length;
  const applicationsPerWeek = round1(recentApplied / 4);
  const due = contacts.filter(isDue).length;

  const signals = [];
  if (active.length < 8) signals.push("Top of funnel is thin: add more contacts before judging conversion.");
  if (applicationsPerWeek < 3) signals.push("Application pace is low: volume is probably the first bottleneck.");
  if (reached.Applied >= 5 && rates.appliedToInterviewing < 0.25) {
    signals.push("Applications are not turning into interviews yet: tune targeting, CV, and referrals.");
  }
  if (reached.Interviewing >= 3 && rates.interviewingToOffer < 0.2) {
    signals.push("Interview conversion is the bottleneck: prioritize retros and focused drills.");
  }
  if (due > 0) signals.push(`${due} follow-up${due === 1 ? "" : "s"} due: clear these before adding more leads.`);
  if (signals.length === 0) signals.push("Pipeline shape is healthy enough: keep shipping applications and learning from replies.");

  return {
    total: contacts.length,
    active: active.length,
    counts,
    reached,
    rates,
    recentApplied,
    applicationsPerWeek,
    due,
    signals,
    statuses: ACTIVE_STATUSES,
  };
}
