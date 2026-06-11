// Hiring pipeline domain: status lifecycle and DD-MM-YYYY date rules.

export const STATUSES = ["Contacted", "Applied", "Interviewing", "Offer", "Rejected"];

/** @type {Record<string, { color: string, bg: string }>} */
export const STATUS_STYLES = {
  Contacted: { color: "#0ea5e9", bg: "#0ea5e920" },
  Applied: { color: "#10b981", bg: "#10b98120" },
  Interviewing: { color: "#f59e0b", bg: "#f59e0b20" },
  Offer: { color: "#8b5cf6", bg: "#8b5cf620" },
  Rejected: { color: "#64748b", bg: "#64748b20" },
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
