import { isDue, parseDDMMYYYY, recentStruggledTechs, todayDDMMYYYY } from "../contacts.js";

const toDDMMYYYY = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

describe("parseDDMMYYYY", () => {
  it("parses a valid date", () => {
    const date = parseDDMMYYYY("10-06-2026");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(10);
  });

  it("returns null for empty or malformed input", () => {
    expect(parseDDMMYYYY("")).toBeNull();
    expect(parseDDMMYYYY(undefined)).toBeNull();
    expect(parseDDMMYYYY("2026-06-10x")).toBeNull();
    expect(parseDDMMYYYY("junk")).toBeNull();
  });
});

describe("todayDDMMYYYY", () => {
  it("round-trips through the parser as today", () => {
    const parsed = parseDDMMYYYY(todayDDMMYYYY());
    const now = new Date();
    expect(parsed.getDate()).toBe(now.getDate());
    expect(parsed.getMonth()).toBe(now.getMonth());
    expect(parsed.getFullYear()).toBe(now.getFullYear());
  });
});

describe("isDue", () => {
  const contact = (overrides) => ({ nextAction: "follow up", nextActionDate: "", ...overrides });

  it("is due when the next action date is in the past", () => {
    expect(isDue(contact({ nextActionDate: toDDMMYYYY(daysFromNow(-1)) }))).toBe(true);
  });

  it("is due on the day itself", () => {
    expect(isDue(contact({ nextActionDate: toDDMMYYYY(new Date()) }))).toBe(true);
  });

  it("is not due for a future date", () => {
    expect(isDue(contact({ nextActionDate: toDDMMYYYY(daysFromNow(1)) }))).toBe(false);
  });

  it("is never due without an action text, even with a past date", () => {
    expect(isDue({ nextAction: "", nextActionDate: toDDMMYYYY(daysFromNow(-5)) })).toBe(false);
  });

  it("is never due without a date", () => {
    expect(isDue(contact())).toBe(false);
  });
});

describe("recentStruggledTechs", () => {
  it("dedupes techs from the newest tagged retros across contacts", () => {
    const contacts = [
      { retros: [{ date: "01-06-2026", struggledTechs: ["React", "Docker"] }] },
      { retros: [{ date: "05-06-2026", struggledTechs: ["Docker", "Kubernetes"] }, { date: "02-06-2026" }] },
    ];
    expect(recentStruggledTechs(contacts)).toEqual(["Docker", "Kubernetes", "React"]);
  });

  it("only considers the most recent tagged retros", () => {
    const retros = ["05", "04", "03", "02", "01"].map((d) => ({
      date: `${d}-06-2026`,
      struggledTechs: [`tech-${d}`],
    }));
    const techs = recentStruggledTechs([{ retros }], { maxRetros: 2 });
    expect(techs).toEqual(["tech-05", "tech-04"]);
  });

  it("handles contacts without retros or tags", () => {
    expect(recentStruggledTechs([{}, { retros: [{ date: "01-01-2026" }] }])).toEqual([]);
  });
});
