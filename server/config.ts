import "dotenv/config";
import { z } from "zod";

const booleanString = z.enum(["true", "false"]).default("false").transform((value) => value === "true");

const schema = z.object({
  APP_ENV: z.enum(["local", "test", "production"]).default("local"),
  PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DEMO_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_DATABASE: z.string().default("local_govtech_floodsense"),
  DB_USERNAME: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_SSL: booleanString,
  RAIN_FRESHNESS_MINUTES: z.coerce.number().positive().default(30),
  TMA_FRESHNESS_MINUTES: z.coerce.number().positive().default(15),
});

export const config = schema.parse(process.env);
