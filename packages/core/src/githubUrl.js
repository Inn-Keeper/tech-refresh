const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

/**
 * True only when `url` is an https URL whose host is github.com itself.
 *
 * Uses host parsing rather than substring matching so spoofed values such as
 * `https://github.com.evil.com/` or `https://evil.com/github.com/` are rejected.
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isGithubProfileUrl(url) {
  if (typeof url !== "string" || url === "") return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && GITHUB_HOSTS.has(hostname.toLowerCase());
  } catch {
    return false;
  }
}
