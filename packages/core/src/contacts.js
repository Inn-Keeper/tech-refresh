// Hiring pipeline domain: status lifecycle and DD-MM-YYYY date rules.

export const STATUSES = ["Contacted", "Applied", "Interviewing", "Offer", "Rejected"];

export const ROLE_POSITIONS = [
  "Frontend Engineer",
  "Senior Frontend Engineer",
  "Backend Engineer",
  "Senior Backend Engineer",
  "Full Stack Engineer",
  "Senior Full Stack Engineer",
  "Mobile Engineer",
  "Senior Mobile Engineer",
  "React Native Engineer",
  "Senior React Native Engineer",
  "iOS Engineer",
  "Senior iOS Engineer",
  "Android Engineer",
  "Senior Android Engineer",
  "DevOps Engineer",
  "Senior DevOps Engineer",
  "Platform Engineer",
  "Senior Platform Engineer",
  "Cloud Engineer",
  "Senior Cloud Engineer",
  "Site Reliability Engineer",
  "Senior Site Reliability Engineer",
  "Data Engineer",
  "Senior Data Engineer",
  "Machine Learning Engineer",
  "Senior Machine Learning Engineer",
  "AI Engineer",
  "Senior AI Engineer",
  "QA Engineer",
  "Senior QA Engineer",
  "Test Automation Engineer",
  "Senior Test Automation Engineer",
  "Security Engineer",
  "Senior Security Engineer",
  "Solutions Architect",
  "Senior Solutions Architect",
  "Engineering Manager",
  "Senior Engineering Manager",
  "Technical Lead",
  "Staff Engineer",
  "Principal Engineer",
  "Recruiter",
  "Talent Partner",
];

// Data-viz ramp: Tailwind-400 weights, no teal (reserved for the brand accent),
// no pure danger-red (reserved for errors). Rules in /DESIGN.md.
const statusStyle = (color) => ({ color, bg: `${color}20` });

/** @type {Record<string, { color: string, bg: string }>} */
export const STATUS_STYLES = {
  Contacted: statusStyle("#38BDF8"),
  Applied: statusStyle("#4ADE80"),
  Interviewing: statusStyle("#FBBF24"),
  Offer: statusStyle("#A78BFA"),
  Rejected: statusStyle("#6B7690"),
};

/** @param {Date} date */
export function formatDDMMYYYY(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function todayDDMMYYYY() {
  return formatDDMMYYYY(new Date());
}

export function parseDDMMYYYY(s) {
  const [d, m, y] = (s || "").split("-").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

// A contact needs attention when its next action is due today or overdue.
export function isDue(contact) {
  const due = parseDDMMYYYY(contact.nextActionDate);
  if (!due || !contact.nextAction) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due <= today;
}
