import { Router } from "express";
import { db, leaderboardTable } from "@workspace/db";
import {
  GetLeaderboardQueryParams,
  SubmitScoreBody,
  GetPersonalBestQueryParams,
} from "@workspace/api-zod";
import { desc, eq, and } from "drizzle-orm";

const leaderboardRouter = Router();

// GET /leaderboard
leaderboardRouter.get("/leaderboard", async (req, res) => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { limit = 10, trackId } = parsed.data;

  const conditions = [];
  if (trackId) conditions.push(eq(leaderboardTable.trackId, trackId));

  const entries = await db
    .select()
    .from(leaderboardTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leaderboardTable.bestLapMs))
    .limit(limit)
    .then((rows) => rows.sort((a, b) => a.bestLapMs - b.bestLapMs));

  return res.json(entries);
});

// POST /leaderboard
leaderboardRouter.post("/leaderboard", async (req, res) => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const [entry] = await db
    .insert(leaderboardTable)
    .values(parsed.data)
    .returning();

  return res.status(201).json(entry);
});

// GET /leaderboard/personal-best
leaderboardRouter.get("/leaderboard/personal-best", async (req, res) => {
  const parsed = GetPersonalBestQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { playerName, trackId } = parsed.data;

  const entries = await db
    .select()
    .from(leaderboardTable)
    .where(
      and(
        eq(leaderboardTable.playerName, playerName),
        eq(leaderboardTable.trackId, trackId)
      )
    )
    .orderBy(leaderboardTable.bestLapMs)
    .limit(1);

  if (!entries.length) {
    return res.status(404).json({ error: "No entry found" });
  }

  return res.json(entries[0]);
});

export default leaderboardRouter;
