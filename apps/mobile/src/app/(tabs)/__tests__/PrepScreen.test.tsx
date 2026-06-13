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
    getQuestions: jest.fn(async () => [
      { id: "q1", tech: "TypeScript", category: "Languages", difficulty: "easy", prompt: "Sample?", options: ["a", "b", "c", "d"], correct: 0, explanation: null },
    ]),
  },
}));

jest.mock("@/lib/useScores", () => ({
  useScores: jest.fn(() => ({ scores: { xp: 0, answers: {} }, record: jest.fn(), addXp: jest.fn() })),
}));

describe("PrepScreen", () => {
  it("renders the prep dashboard, picks a tier, and starts a drill", async () => {
    const view = await renderWithClient(<PrepScreen />);

    expect(view.getByText(/Intern/)).toBeTruthy();
    expect(view.getByText("Accuracy over time")).toBeTruthy();

    await waitFor(() => expect(api.getAccuracyTimeline).toHaveBeenCalled());

    // Drill button opens the sassy tier picker rather than starting immediately.
    fireEvent.press(view.getByText(/Drill weakest/));
    await waitFor(() => expect(view.getByText("Pick your pain")).toBeTruthy());

    // Choosing a tier fetches that level's questions and enters the drill.
    fireEvent.press(view.getByText("Newbie"));
    await waitFor(() => expect(view.getByText("DRILL")).toBeTruthy());
    expect(api.getQuestions).toHaveBeenCalled();
    expect(useScores).toHaveBeenCalled();
  });
});
