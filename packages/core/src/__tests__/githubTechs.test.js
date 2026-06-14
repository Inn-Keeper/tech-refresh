import { buildGithubTechCategory, githubLanguagesToPrepTechs, githubUsernameFromUrl } from "../githubTechs.js";

describe("GitHub tech helpers", () => {
  it("extracts a GitHub username from profile URLs", () => {
    expect(githubUsernameFromUrl("https://github.com/ada")).toBe("ada");
    expect(githubUsernameFromUrl("github.com/grace?tab=repositories")).toBe("grace");
    expect(githubUsernameFromUrl("https://example.com/ada")).toBe("");
  });

  it("maps GitHub language totals to known prep technologies", () => {
    expect(
      githubLanguagesToPrepTechs(
        { TypeScript: 1000, JavaScript: 700, CSS: 400, Ruby: 999 },
        ["TypeScript", "JavaScript", "HTML/CSS"]
      )
    ).toEqual([
      { tech: "TypeScript", score: 1000 },
      { tech: "JavaScript", score: 700 },
      { tech: "HTML/CSS", score: 400 },
    ]);
  });

  it("builds a category from matched tech cards", () => {
    const category = buildGithubTechCategory(
      [{ tech: "TypeScript", oneliner: "Typed JS" }, { tech: "Docker", oneliner: "Containers" }],
      [{ tech: "Docker", score: 20 }]
    );

    expect(category).toMatchObject({
      name: "From GitHub techs",
      items: [{ tech: "Docker", oneliner: "Containers", githubScore: 20 }],
    });
  });

  it("omits the GitHub category when no profile techs are available", () => {
    expect(buildGithubTechCategory([{ tech: "TypeScript" }], [])).toBeNull();
    expect(buildGithubTechCategory([{ tech: "TypeScript" }], [{ tech: "Rust", score: 20 }])).toBeNull();
  });
});
