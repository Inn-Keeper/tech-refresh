export const PROFILE_FIELDS = [
  { key: "displayName", label: "Display name", placeholder: "What should Grip call you?" },
  { key: "headline", label: "Headline", placeholder: "Frontend engineer, systems learner..." },
  { key: "targetRole", label: "Target role", placeholder: "Senior Frontend Engineer" },
  { key: "location", label: "Location", placeholder: "Stockholm, remote, hybrid..." },
  { key: "timezone", label: "Timezone", placeholder: "Europe/Stockholm" },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/you", keyboardType: "url" },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/you", keyboardType: "url" },
  { key: "portfolioUrl", label: "Portfolio", placeholder: "https://your-site.dev", keyboardType: "url" },
];

export const EMPTY_PROFILE_FORM = PROFILE_FIELDS.reduce((form, field) => ({ ...form, [field.key]: "" }), {});

export function profileToForm(profile) {
  return PROFILE_FIELDS.reduce(
    (form, field) => ({ ...form, [field.key]: profile?.[field.key] ?? "" }),
    {}
  );
}

export function profileFormToUpdate(form) {
  const update = { ...EMPTY_PROFILE_FORM, ...form, onboardingCompleted: true };
  if ("useGithubTechsForPrep" in form) update.useGithubTechsForPrep = form.useGithubTechsForPrep;
  return update;
}
