import type { schema } from "@coss/db";

export type Project = typeof schema.project.$inferSelect;
export type Environment = typeof schema.environment.$inferSelect;
export type EnvironmentMode = Environment["mode"];
