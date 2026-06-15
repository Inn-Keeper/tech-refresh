// Shared auth helpers. Keep framework-free so web and mobile import the same logic.

/**
 * Turns a Supabase auth error message into actionable guidance for the two
 * misconfigurations users actually hit (provider disabled, manual linking off),
 * passing anything else through unchanged.
 * @param {string} message
 * @returns {string}
 */
export function friendlyAuthError(message = "") {
  if (message.includes("Unsupported provider")) {
    return "GitHub login is not enabled in Supabase yet. Enable the GitHub provider, then try again.";
  }
  if (message.includes("Manual linking")) {
    return "Identity linking is disabled in Supabase Auth. Enable manual linking, then try again.";
  }
  return message;
}
