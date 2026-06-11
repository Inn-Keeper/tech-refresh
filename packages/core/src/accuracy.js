// Accuracy analytics from normalized answer_events.

const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

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
