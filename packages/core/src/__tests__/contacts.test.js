import { isDue, parseDDMMYYYY, todayDDMMYYYY } from "../contacts.js";

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
