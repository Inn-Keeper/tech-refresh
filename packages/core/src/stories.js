// STAR story bank domain: competencies and behavioral interview prompts.

export const COMPETENCIES = [
  "Conflict",
  "Failure",
  "Leadership",
  "Impact",
  "Ambiguity",
  "Influence",
  "Mentoring",
  "Delivery",
];

/** @type {Record<string, string>} */
// Data-viz ramp: Tailwind-400 weights, no teal (reserved for the brand accent),
// no pure danger-red (reserved for errors). Rules in /DESIGN.md.
export const COMPETENCY_COLORS = {
  Conflict: "#FB7185",
  Failure: "#FB923C",
  Leadership: "#A78BFA",
  Impact: "#4ADE80",
  Ambiguity: "#FACC15",
  Influence: "#38BDF8",
  Mentoring: "#818CF8",
  Delivery: "#F472B6",
};

export const PROMPTS = [
  { competency: "Conflict", text: "Tell me about a time you disagreed with a colleague or your manager. How did you resolve it?" },
  { competency: "Conflict", text: "Describe a time you received harsh feedback. What did you do with it?" },
  { competency: "Failure", text: "Tell me about a project that failed. What was your role in the failure?" },
  { competency: "Failure", text: "Describe a mistake of yours that reached production. What happened next?" },
  { competency: "Leadership", text: "Tell me about a time you led without formal authority." },
  { competency: "Leadership", text: "Describe a time you had to make an unpopular decision." },
  { competency: "Impact", text: "What's the most impactful thing you've shipped? How do you know it mattered?" },
  { competency: "Impact", text: "Tell me about a time you improved something everyone else had accepted as fine." },
  { competency: "Ambiguity", text: "Describe a project where the requirements were unclear. How did you proceed?" },
  { competency: "Ambiguity", text: "Tell me about a time priorities changed mid-project. How did you adapt?" },
  { competency: "Influence", text: "Tell me about a time you convinced a team to change direction." },
  { competency: "Influence", text: "Describe a time you had to get buy-in from a skeptical stakeholder." },
  { competency: "Mentoring", text: "Tell me about how you've helped a junior engineer grow." },
  { competency: "Mentoring", text: "Describe a time you raised the engineering bar on your team." },
  { competency: "Delivery", text: "Tell me about a time you had to cut scope to hit a deadline." },
  { competency: "Delivery", text: "Walk me through the most complex thing you've delivered end-to-end." },
];
