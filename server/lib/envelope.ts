import type { Response } from "express";

export type DataMode = "database" | "demo";

export function sendData<T>(res: Response, data: T, mode: DataMode, extra: Record<string, unknown> = {}) {
  return res.json({
    data,
    meta: {
      generated_at: new Date().toISOString(),
      timezone: "Asia/Jakarta",
      data_mode: mode,
      limitations: mode === "demo"
        ? ["Data hidrologi dan skor risiko merupakan skenario demo, bukan kondisi operasional."]
        : [],
      ...extra,
    },
  });
}
