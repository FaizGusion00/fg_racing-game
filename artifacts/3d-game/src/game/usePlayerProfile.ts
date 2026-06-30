import { useState, useCallback } from "react";

export interface PlayerProfile {
  level: number;
  xp: number;
  totalRaces: number;
  personalBests: Record<string, number>; // trackId -> bestLapMs
}

const STORAGE_KEY = "apex-rush-profile";
const MAX_LEVEL = 20;

// XP needed to reach each level (cumulative)
export const XP_THRESHOLDS = [
  0, 150, 350, 650, 1050, 1550, 2200, 2950, 3850, 4900,
  6100, 7500, 9100, 11000, 13200, 15750, 18650, 21900, 25500, 29500,
];

export const LEVEL_TITLES: Record<number, string> = {
  1: "Rookie",
  2: "Rookie",
  3: "Amateur",
  4: "Amateur",
  5: "Racer",
  6: "Racer",
  7: "Veteran",
  8: "Veteran",
  9: "Pro",
  10: "Pro",
  11: "Expert",
  12: "Expert",
  13: "Master",
  14: "Master",
  15: "Legend",
  16: "Legend",
  17: "Elite",
  18: "Elite",
  19: "Champion",
  20: "Champion",
};

function defaultProfile(): PlayerProfile {
  return {
    level: 1,
    xp: 0,
    totalRaces: 0,
    personalBests: {},
  };
}

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    return defaultProfile();
  }
}

function saveProfile(p: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function getLevelProgress(profile: PlayerProfile): {
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  const lvl = Math.min(profile.level, MAX_LEVEL);
  const currentLevelXp = lvl >= 1 ? XP_THRESHOLDS[lvl - 1] : 0;
  const nextLevelXp =
    lvl < MAX_LEVEL ? XP_THRESHOLDS[lvl] : XP_THRESHOLDS[MAX_LEVEL - 1] + 1000;
  const progress = Math.min(
    1,
    (profile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  );
  return { currentLevelXp, nextLevelXp, progress };
}

export function computeXpReward(
  profile: PlayerProfile,
  trackId: string,
  bestLapMs: number,
  totalTimeMs: number,
  lapsCompleted: number,
  totalLaps: number
): { xpGained: number; personalBestBeaten: boolean } {
  let xp = 80; // base for completing a race

  const completedAllLaps = lapsCompleted >= totalLaps;
  if (completedAllLaps) xp += 60;

  // Personal best bonus
  const prev = profile.personalBests[trackId];
  const personalBestBeaten = !prev || bestLapMs < prev;
  if (personalBestBeaten) xp += 80;

  // Level multiplier
  const mult = 1 + (profile.level - 1) * 0.05;
  xp = Math.round(xp * mult);

  return { xpGained: xp, personalBestBeaten };
}

export function applyXpToProfile(
  profile: PlayerProfile,
  xpGained: number,
  trackId: string,
  bestLapMs: number
): { profile: PlayerProfile; leveledUp: boolean; newLevel: number } {
  const newProfile = { ...profile };
  newProfile.xp = profile.xp + xpGained;
  newProfile.totalRaces = profile.totalRaces + 1;

  // Personal best
  const prev = profile.personalBests[trackId];
  if (!prev || bestLapMs < prev) {
    newProfile.personalBests = { ...profile.personalBests, [trackId]: bestLapMs };
  }

  // Level up
  let leveledUp = false;
  let newLevel = newProfile.level;
  while (newLevel < MAX_LEVEL && newProfile.xp >= XP_THRESHOLDS[newLevel]) {
    newLevel++;
    leveledUp = true;
  }
  newProfile.level = newLevel;

  return { profile: newProfile, leveledUp, newLevel };
}

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());

  const awardXp = useCallback(
    (
      trackId: string,
      bestLapMs: number,
      totalTimeMs: number,
      lapsCompleted: number,
      totalLaps: number
    ): { xpGained: number; leveledUp: boolean; personalBestBeaten: boolean } => {
      let result = { xpGained: 0, leveledUp: false, personalBestBeaten: false };
      setProfile((prev) => {
        const { xpGained, personalBestBeaten } = computeXpReward(
          prev,
          trackId,
          bestLapMs,
          totalTimeMs,
          lapsCompleted,
          totalLaps
        );
        const { profile: next, leveledUp, newLevel } = applyXpToProfile(
          prev,
          xpGained,
          trackId,
          bestLapMs
        );
        saveProfile(next);
        result = { xpGained, leveledUp, personalBestBeaten };
        return next;
      });
      return result;
    },
    []
  );

  const resetProfile = useCallback(() => {
    const p = defaultProfile();
    saveProfile(p);
    setProfile(p);
  }, []);

  return { profile, awardXp, resetProfile };
}
