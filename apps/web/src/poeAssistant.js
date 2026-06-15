export const POE_ASSISTANT_VISIBLE_KEY = "grip.poeAssistantVisible";
export const POE_ASSISTANT_PREF_EVENT = "grip:poe-assistant-preference";

export const POE_PHRASES = {
  idle: [
    "One skill at a time, friend.",
    "Back to the practice board.",
    "Your next role is in there somewhere.",
  ],
  correct: [
    "Correct. I was prepared to pretend to be surprised.",
    "Good. The question has been humbled.",
    "That one had the courtesy to fall over.",
  ],
  wrong: [
    "A majestic wrong turn. Useful, at least.",
    "Incorrect. The path remains annoyed but open.",
    "No. But it was a very confident no.",
  ],
  levelUp: [
    "Rank up. Try to look surprised.",
    "The ladder moved. You moved faster.",
    "Progress, with witnesses.",
  ],
  thinking: [
    "Think it through. Then make it fear you.",
    "The answer is hiding in plain sight. Rude of it.",
    "Steady. Sharp minds take a breath.",
  ],
};

export function poeVisibleByDefault() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(POE_ASSISTANT_VISIBLE_KEY) !== "0";
}

export function setPoeAssistantVisible(visible) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POE_ASSISTANT_VISIBLE_KEY, visible ? "1" : "0");
  window.dispatchEvent(new CustomEvent(POE_ASSISTANT_PREF_EVENT, { detail: { visible } }));
}

export function poeLineFor(type, seed = 0) {
  const lines = POE_PHRASES[type] ?? POE_PHRASES.idle;
  return lines[Math.abs(seed) % lines.length];
}
