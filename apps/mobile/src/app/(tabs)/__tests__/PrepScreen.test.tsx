import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { api } from "@/lib/api";
import { useScores } from "@/lib/useScores";
import { renderWithClient } from "@/test/renderWithClient";
import PrepScreen from "../index";

jest.mock("@/lib/api", () => ({
  api: {
    getAccuracyTimeline: jest.fn(async () => [
      { date: "2026-06-10", accuracy: 0.5, total: 2 },
      { date: "2026-06-11", accuracy: 0.75, total: 4 },
    ]),
  },
}));

jest.mock("@/lib/useScores", () => ({
  useScores: jest.fn(() => ({ scores: { xp: 0, answers: {} }, record: jest.fn(), addXp: jest.fn() })),
}));

describe("PrepScreen", () => {
  it("renders the prep dashboard and starts a drill", async () => {
    const view = await renderWithClient(<PrepScreen />);

    expect(view.getByText(/Intern/)).toBeTruthy();
    expect(view.getByText("Accuracy over time")).toBeTruthy();

    await waitFor(() => expect(api.getAccuracyTimeline).toHaveBeenCalled());
    fireEvent.press(view.getByText(/Drill weakest/));

    await waitFor(() => expect(view.getByText("🎯 DRILL")).toBeTruthy());
    expect(useScores).toHaveBeenCalled();
  });
});
