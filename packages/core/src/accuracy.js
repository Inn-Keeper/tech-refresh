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
  const sorted = events
    // Keep only events with a parseable timestamp — a bad value would otherwise
    // produce a "NaN-NaN-NaN" bucket and poison the sort.
    .map((event) => ({ event, time: new Date(event.createdAt ?? event.created_at).getTime() }))
    .filter(({ time }) => !Number.isNaN(time))
    .sort((a, b) => a.time - b.time);

  let correct = 0;
  let total = 0;
  const byDay = new Map();

  for (const { event, time } of sorted) {
    total += 1;
    if (event.correct) correct += 1;
    const key = dayKey(time);
    byDay.set(key, { date: key, accuracy: correct / total, correct, total });
  }

  return [...byDay.values()];
}
