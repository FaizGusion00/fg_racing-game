import { Router } from "express";
import { db } from "@workspace/db";
import { playerProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/authMiddleware";
import { XP_THRESHOLDS, MAX_LEVEL } from "../lib/levelLogic";

const profileRouter = Router();

// GET /api/profile
profileRouter.get("/profile", requireAuth, async (req, res) => {
  const { userId, username } = req.user!;

  let [profile] = await db
    .select()
    .from(playerProfilesTable)
    .where(eq(playerProfilesTable.userId, userId))
    .limit(1);

  if (!profile) {
    // Auto-create if missing
    [profile] = await db
      .insert(playerProfilesTable)
      .values({ userId })
      .returning();
  }

  res.json({
    userId,
    username,
    level: profile.level,
    xp: profile.xp,
    totalRaces: profile.totalRaces,
    personalBests: profile.personalBests,
  });
});

// PATCH /api/profile — apply XP + personal best after a race
profileRouter.patch("/profile", requireAuth, async (req, res) => {
  const { userId, username } = req.user!;
  const { xpGained, trackId, bestLapMs, lapsCompleted } = req.body as {
    xpGained: number;
    trackId: string;
    bestLapMs: number;
    totalTimeMs: number;
    lapsCompleted: number;
  };

  let [profile] = await db
    .select()
    .from(playerProfilesTable)
    .where(eq(playerProfilesTable.userId, userId))
    .limit(1);

  if (!profile) {
    [profile] = await db
      .insert(playerProfilesTable)
      .values({ userId })
      .returning();
  }

  const newXp = profile.xp + (xpGained ?? 0);

  // Update personal best
  const currentBests: Record<string, number> = (profile.personalBests as Record<string, number>) ?? {};
  const prevBest = currentBests[trackId];
  if (bestLapMs && (!prevBest || bestLapMs < prevBest)) {
    currentBests[trackId] = bestLapMs;
  }

  // Level up
  let newLevel = profile.level;
  while (newLevel < MAX_LEVEL && newXp >= XP_THRESHOLDS[newLevel]) {
    newLevel++;
  }

  const [updated] = await db
    .update(playerProfilesTable)
    .set({
      xp: newXp,
      level: newLevel,
      totalRaces: profile.totalRaces + 1,
      personalBests: currentBests,
      updatedAt: new Date(),
    })
    .where(eq(playerProfilesTable.userId, userId))
    .returning();

  res.json({
    userId,
    username,
    level: updated.level,
    xp: updated.xp,
    totalRaces: updated.totalRaces,
    personalBests: updated.personalBests,
  });
});

export default profileRouter;
