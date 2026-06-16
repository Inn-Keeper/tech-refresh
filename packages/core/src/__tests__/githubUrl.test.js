import { isGithubProfileUrl } from "../githubUrl.js";

describe("isGithubProfileUrl", () => {
  test("accepts a real github.com profile URL", () => {
    expect(isGithubProfileUrl("https://github.com/octocat")).toBe(true);
  });

  test("accepts www.github.com", () => {
    expect(isGithubProfileUrl("https://www.github.com/octocat")).toBe(true);
  });

  test("is case-insensitive on the host", () => {
    expect(isGithubProfileUrl("https://GitHub.com/octocat")).toBe(true);
  });

  // Spoofing vectors the old `includes("github.com/")` check let through.
  test("rejects a look-alike subdomain host", () => {
    expect(isGithubProfileUrl("https://github.com.evil.com/octocat")).toBe(false);
  });

  test("rejects github.com appearing only in the path", () => {
    expect(isGithubProfileUrl("https://evil.com/github.com/octocat")).toBe(false);
  });

  test("rejects github.com in a query string", () => {
    expect(isGithubProfileUrl("https://evil.com/?x=github.com/octocat")).toBe(false);
  });

  test("rejects non-https schemes", () => {
    expect(isGithubProfileUrl("http://github.com/octocat")).toBe(false);
    expect(isGithubProfileUrl("javascript:alert(1)//github.com/")).toBe(false);
  });

  test("rejects avatar host", () => {
    expect(isGithubProfileUrl("https://avatars.githubusercontent.com/u/1")).toBe(false);
  });

  test("rejects empty, non-string, and malformed values", () => {
    expect(isGithubProfileUrl("")).toBe(false);
    expect(isGithubProfileUrl(undefined)).toBe(false);
    expect(isGithubProfileUrl(null)).toBe(false);
    expect(isGithubProfileUrl(42)).toBe(false);
    expect(isGithubProfileUrl("not a url")).toBe(false);
  });
});
