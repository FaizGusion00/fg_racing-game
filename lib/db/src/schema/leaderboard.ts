import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  trackId: text("track_id").notNull(),
  totalTimeMs: integer("total_time_ms").notNull(),
  bestLapMs: integer("best_lap_ms").notNull(),
  lapsCompleted: integer("laps_completed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({ id: true, createdAt: true });
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardRow = typeof leaderboardTable.$inferSelect;
