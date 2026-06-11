// Accuracy analytics from normalized answer_events.

const dayKey = (value) => {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  // Local day, not UTC: a late-evening session should not land on tomorrow.
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Builds a cumulative daily accuracy line from answer events.
 * @param {Array<{ correct: boolean, createdAt?: string, created_at?: string }>} events
 */
export function buildAccuracyTimeline(events = []) {
  const sorted = [...events]
    .filter((event) => event.createdAt || event.created_at)
    .sort((a, b) => new Date(a.createdAt ?? a.created_at).getTime() - new Date(b.createdAt ?? b.created_at).getTime());

  let correct = 0;
  let total = 0;
  const byDay = new Map();

  for (const event of sorted) {
    total += 1;
    if (event.correct) correct += 1;
    byDay.set(dayKey(event.createdAt ?? event.created_at), {
      date: dayKey(event.createdAt ?? event.created_at),
      accuracy: correct / total,
      correct,
      total,
    });
  }

  return [...byDay.values()];
}
