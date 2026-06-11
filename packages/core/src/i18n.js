// Dependency-free i18n: a flat key->template dictionary with {var}
// interpolation. English-only today; adding a locale = adding a dictionary
// and calling setLocale. Upgrade path if plurals/ICU are ever needed: i18next.

export const en = {
  "common.save": "Save",
  "common.saving": "Saving",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.clear": "Clear",
  "common.close": "Close",
  "common.load": "Load",
  "common.loading": "Loading…",
  "common.done": "Done ✓",
  "common.next": "Next →",

  "auth.appName": "Interview Prep",
  "auth.signIn": "Sign in",
  "auth.createAccount": "Create account",
  "auth.tagline": "Your pipeline and scores live behind your account.",
  "auth.emailPlaceholder": "you@email.com",
  "auth.passwordPlaceholder": "password",
  "auth.newPasswordPlaceholder": "password (8+ characters)",
  "auth.switchToSignUp": "New here? Create an account",
  "auth.switchToSignIn": "Already have an account? Sign in",
  "auth.signOut": "Sign out",
  "auth.confirmEmailNotice":
    "Account created, but email confirmation is enabled in Supabase. Disable “Confirm email” under Authentication → Sign In / Providers to activate accounts instantly.",

  "tabs.prep": "Prep",
  "tabs.stories": "Stories",
  "tabs.board": "Arch Board",
  "tabs.contacts": "Contacts",

  "prep.drillWeakest": "🎯 Drill weakest",
  "prep.ranking": "Ranking",
  "prep.strongest": "💪 Strongest",
  "prep.needsWork": "📉 Needs work",
  "prep.xpRules": "+{correct} XP per correct answer · +{bonus} XP for a perfect quiz",
  "prep.xpToNext": "{xp} XP to {rank}",
  "prep.accuracySummary": "{pct}% accuracy · {count} answered",
  "prep.takeQuiz": "Take quiz →",
  "prep.correct": "Correct! +{xp} XP",
  "prep.incorrect": "Incorrect",
  "prep.docs": "Docs ↗",
  "prep.finish": "Finish ✓",
  "prep.drillTag": "🎯 DRILL",
  "prep.exit": "Exit",
  "prep.backToCards": "Back to cards",
  "prep.drillResult": "+{xp} XP{bonus} — accuracy recorded per tech, so the next drill adapts.",
  "prep.perfectBonusSuffix": " · +{bonus} perfect bonus",

  "accuracy.title": "Accuracy over time",
  "accuracy.subtitle": "Cumulative from answer events",
  "accuracy.empty": "Answer a few cards to draw the line.",

  "celebration.perfectTitle": "Perfect drill",
  "celebration.perfectSubtitle": "Clean run: +{bonus} bonus XP landed.",
  "celebration.rankTitle": "{rank} unlocked",
  "celebration.rankSubtitle": "{xp} XP reached. The ladder noticed.",

  "stories.myStories": "✍️ My stories",
  "stories.drillPrompts": "🎤 Drill prompts",
  "stories.addStory": "+ Add story",
  "stories.empty": "No stories yet. Start with your best \"impact\" story.",
  "stories.loadError": "Couldn't load stories: {message}",
  "stories.deleteTitle": "Delete story",
  "stories.deleteMessage": "Delete \"{title}\"?",
  "stories.answerOutLoud": "Answer out loud — aim for 90 seconds.",
  "stories.reveal": "Reveal my stories",
  "stories.nextPrompt": "Next →",
  "stories.noStoryFor": "⚠️ No story tagged \"{competency}\" yet — that's a gap an interviewer will find first.",

  "contacts.addContact": "+ Add contact",
  "contacts.loadError": "Couldn't load contacts: {message}",
  "contacts.dueBanner": "⏰ {count} follow-up{plural} due — these lose offers when they slip.",
  "contacts.deleteTitle": "Delete contact",
  "contacts.deleteMessage": "Delete \"{name}\"?",
  "contacts.addRetro": "+ Retro",
  "contacts.retros": "📓 Retros ({count})",
  "contacts.saveRetro": "Save retro",

  "funnel.title": "Funnel dashboard",
  "funnel.subtitle": "Current pipeline shape and weekly application pace",
  "funnel.active": "{count} active",
  "funnel.appsPerWeek": "Apps/week",
  "funnel.interviews": "Interviews",
  "funnel.offers": "Offers",
  "funnel.contactedToApplied": "Contacted → Applied",
  "funnel.appliedToInterviewing": "Applied → Interviewing",
  "funnel.interviewingToOffer": "Interviewing → Offer",

  "board.saved": "Saved",
  "board.evaluate": "Evaluate",
  "board.fit": "⛶ Fit",
  "board.savedBoards": "Saved boards",
  "board.savedTotal": "{count} total",
  "board.savedEmpty": "Save a board to reuse or refine it later.",
  "board.boardMeta": "{scenario} · {nodes} nodes · {edges} wires",
  "board.draftTitle": "{scenario} draft",
  "board.deleteTitle": "Delete saved board",
  "board.deleteMessage": "Delete \"{title}\"?",
  "board.saveFailedTitle": "Save failed",
  "board.boardsError": "Couldn't load saved boards: {message}",
  "board.unknownScenarioTitle": "Can't load board",
  "board.unknownScenarioMessage": "This board was saved for a scenario that no longer exists ({scenarioId}).",
  "board.removeConnectionTitle": "Remove connection",
  "board.removeConnectionMessage": "Delete this arrow?",
  "board.connectHint": "Tap a target to connect — tap elsewhere to cancel",
  "board.emptyHint":
    "Add components below, drag to arrange,\ntap a node's ● handle then a target to wire them up.\nPinch to zoom · drag empty space to pan.",
  "board.designChecks": "DESIGN CHECKS",
  "board.meetingNotes": "MEETING NOTES",
  "board.verdictShip": "Ship it 🚀",
  "board.verdictReview": "Needs review before the meeting",
  "board.verdictWhiteboard": "Back to the whiteboard",
};

const locales = { en };
let active = en;

/**
 * @param {keyof typeof en} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars) {
  const template = active[key];
  if (typeof template !== "string") return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}

/** @param {keyof typeof locales} name */
export function setLocale(name) {
  active = locales[name] ?? en;
}
