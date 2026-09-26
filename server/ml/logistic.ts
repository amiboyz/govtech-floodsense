export type TrainingRow = { features: number[]; target: 0 | 1; occurredAt: Date };

export type LogisticModel = {
  kind: "logistic_regression";
  featureNames: string[];
  means: number[];
  scales: number[];
  weights: number[];
  bias: number;
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));

export function trainLogistic(
  rows: TrainingRow[],
  featureNames: string[],
  options: { epochs?: number; learningRate?: number; l2?: number } = {},
): LogisticModel {
  if (rows.length < 20) throw new Error("Minimal 20 baris diperlukan untuk training.");
  if (rows.some((row) => row.features.length !== featureNames.length)) throw new Error("Feature schema tidak konsisten.");
  const means = featureNames.map((_, i) => rows.reduce((sum, row) => sum + row.features[i], 0) / rows.length);
  const scales = featureNames.map((_, i) => {
    const variance = rows.reduce((sum, row) => sum + (row.features[i] - means[i]) ** 2, 0) / rows.length;
    return Math.sqrt(variance) || 1;
  });
  const weights = featureNames.map(() => 0);
  let bias = 0;
  const epochs = options.epochs ?? 1200;
  const learningRate = options.learningRate ?? 0.04;
  const l2 = options.l2 ?? 0.002;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradients = weights.map(() => 0);
    let biasGradient = 0;
    for (const row of rows) {
      const normalized = row.features.map((value, i) => (value - means[i]) / scales[i]);
      const probability = sigmoid(bias + normalized.reduce((sum, value, i) => sum + value * weights[i], 0));
      const error = probability - row.target;
      normalized.forEach((value, i) => { gradients[i] += error * value; });
      biasGradient += error;
    }
    weights.forEach((weight, i) => { weights[i] -= learningRate * ((gradients[i] / rows.length) + l2 * weight); });
    bias -= learningRate * (biasGradient / rows.length);
  }
  return { kind: "logistic_regression", featureNames, means, scales, weights, bias };
}

export function predictProbability(model: LogisticModel, features: number[]) {
  const normalized = features.map((value, i) => (value - model.means[i]) / model.scales[i]);
  return sigmoid(model.bias + normalized.reduce((sum, value, i) => sum + value * model.weights[i], 0));
}

export function evaluateClassifier(model: LogisticModel, rows: TrainingRow[], threshold = 0.5) {
  let tp = 0, fp = 0, tn = 0, fn = 0, brier = 0;
  for (const row of rows) {
    const probability = predictProbability(model, row.features);
    const prediction = probability >= threshold ? 1 : 0;
    if (prediction === 1 && row.target === 1) tp += 1;
    if (prediction === 1 && row.target === 0) fp += 1;
    if (prediction === 0 && row.target === 0) tn += 1;
    if (prediction === 0 && row.target === 1) fn += 1;
    brier += (probability - row.target) ** 2;
  }
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  return {
    sample_size: rows.length,
    precision,
    recall,
    f1: (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall),
    false_alarm_rate: fp / Math.max(1, fp + tn),
    missed_event_rate: fn / Math.max(1, fn + tp),
    brier_score: brier / Math.max(1, rows.length),
  };
}
