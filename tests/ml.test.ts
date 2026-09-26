import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateClassifier, predictProbability, trainLogistic } from "../server/ml/logistic.js";
import { forecastLinearTrend } from "../server/ml/forecast.js";

describe("nowcast logistic model", () => {
  it("learns higher flood probability from higher rain and TMA", () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({
      features: [i / 2, 80 + i],
      target: (i > 40 ? 1 : 0) as 0 | 1,
      occurredAt: new Date(2025, 0, i + 1),
    }));
    const model = trainLogistic(rows.slice(0, 60), ["rain_6h", "tma_cm"]);
    assert.ok(predictProbability(model, [38, 155]) > predictProbability(model, [2, 85]));
    assert.equal(evaluateClassifier(model, rows.slice(60)).sample_size, 20);
  });
});

describe("forecast trend", () => {
  it("projects an increasing time series", () => {
    const start = new Date("2026-09-20T00:00:00Z");
    const result = forecastLinearTrend([0, 1, 2, 3].map((hour) => ({
      at: new Date(start.getTime() + hour * 3_600_000),
      value: 100 + hour * 5,
    })), 60);
    assert.ok(Math.abs(result.value - 120) < 0.0001);
    assert.ok(Math.abs(result.slopePerHour - 5) < 0.0001);
  });
});
