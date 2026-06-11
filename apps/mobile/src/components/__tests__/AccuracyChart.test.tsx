import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { AccuracyChart } from "../AccuracyChart";

describe("AccuracyChart", () => {
  it("shows an empty state until enough answers exist", async () => {
    const view = await render(<AccuracyChart points={[]} />);

    expect(view.getByText("Accuracy over time")).toBeTruthy();
    expect(view.getByText("--")).toBeTruthy();
    expect(view.getByText("Answer a few cards to draw the line.")).toBeTruthy();
  });

  it("renders the latest cumulative accuracy when points exist", async () => {
    const view = await render(
      <AccuracyChart
        points={[
          { date: "2026-06-10", accuracy: 0.5, total: 2 },
          { date: "2026-06-11", accuracy: 0.75, total: 4 },
        ]}
      />
    );

    expect(view.getByText("75%")).toBeTruthy();
    expect(view.getByTestId("skia-canvas")).toBeTruthy();
  });
});
