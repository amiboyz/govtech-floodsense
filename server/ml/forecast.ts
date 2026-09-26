export type SeriesPoint = { at: Date; value: number };

export type TrendForecast = {
  issuedAt: Date;
  horizonMinutes: number;
  value: number;
  lower: number;
  upper: number;
  slopePerHour: number;
};

export function forecastLinearTrend(points: SeriesPoint[], horizonMinutes: number): TrendForecast {
  if (points.length < 3) throw new Error("Minimal tiga observasi diperlukan untuk forecast.");
  const sorted = [...points].sort((a, b) => a.at.getTime() - b.at.getTime());
  const origin = sorted[0].at.getTime();
  const xs = sorted.map((point) => (point.at.getTime() - origin) / 3_600_000);
  const ys = sorted.map((point) => point.value);
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 1;
  const slope = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0) / denominator;
  const intercept = yMean - slope * xMean;
  const targetX = xs[xs.length - 1] + horizonMinutes / 60;
  const value = Math.max(0, intercept + slope * targetX);
  const residuals = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const rmse = Math.sqrt(residuals.reduce((sum, e) => sum + e ** 2, 0) / Math.max(1, residuals.length - 2));
  return {
    issuedAt: sorted[sorted.length - 1].at,
    horizonMinutes,
    value,
    lower: Math.max(0, value - 1.96 * rmse),
    upper: value + 1.96 * rmse,
    slopePerHour: slope,
  };
}
