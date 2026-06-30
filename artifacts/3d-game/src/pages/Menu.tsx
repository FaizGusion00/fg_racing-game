import { useState } from "react";
import { useLocation } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { TRACKS, DIFFICULTY_COLOR } from "@/game/trackData";
import { useAuth } from "@/auth/AuthContext";
import { getLevelProgress, LEVEL_TITLES } from "@/game/usePlayerProfile";

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return "--:--.---";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function Menu() {
  const [, setLocation] = useLocation();
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0].id);
  const { user, profile, logout } = useAuth();

  const track = TRACKS.find((t) => t.id === selectedTrack) ?? TRACKS[0];
  const neon = track.neonColor;

  const playerLevel = profile?.level ?? 1;
  const xpProgress = profile ? getLevelProgress(profile).progress : 0;
  const levelTitle = LEVEL_TITLES[playerLevel] ?? "Rookie";

  const { data: leaderboard, isLoading } = useGetLeaderboard({
    trackId: selectedTrack,
    limit: 5,
  });

  const handleStart = () => {
    const t = TRACKS.find((t) => t.id === selectedTrack)!;
    if (t.unlockLevel > playerLevel) return;
    setLocation(
      `/race?track=${encodeURIComponent(selectedTrack)}&player=${encodeURIComponent(user?.username ?? "Racer")}`
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "#050814" }}
    >
      {/* Neon grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(${neon}30 1px, transparent 1px), linear-gradient(90deg, ${neon}30 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: neon }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: neon }} />

      <div className="relative z-10 w-full max-w-xl flex flex-col gap-6">

        {/* Player Profile Card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Level badge */}
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-black"
            style={{ background: `${neon}20`, border: `2px solid ${neon}60` }}
          >
            <span className="text-xs text-gray-400 uppercase" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>LVL</span>
            <span className="text-2xl leading-tight" style={{ color: neon }}>{playerLevel}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-white font-bold text-sm">{user?.username ?? "Pilot"} — {levelTitle}</span>
              <span className="text-gray-500 text-xs">{profile?.xp ?? 0} XP</span>
            </div>
            {/* XP progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round(xpProgress * 100)}%`,
                  background: `linear-gradient(90deg, ${neon}aa, ${neon})`,
                  boxShadow: `0 0 8px ${neon}80`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-500 text-xs">{profile?.totalRaces ?? 0} races</span>
              <span className="text-xs" style={{ color: neon + "99" }}>
                {playerLevel < 20 ? `Next level: ${Math.round(xpProgress * 100)}%` : "MAX LEVEL"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="text-xs uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Logout
          </button>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-6xl font-black uppercase tracking-[0.2em] mb-1"
            style={{ color: neon, textShadow: `0 0 30px ${neon}, 0 0 80px ${neon}60` }}
          >
            APEX RUSH
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest">Futuristic Racing</p>
        </div>

        {/* Track selection */}
        <div className="flex flex-col gap-3">
          <label className="text-xs text-gray-400 uppercase tracking-widest">Select Track</label>
          <div className="grid grid-cols-2 gap-3">
            {TRACKS.map((t) => {
              const locked = t.unlockLevel > playerLevel;
              const isSelected = selectedTrack === t.id;
              const diffColor = DIFFICULTY_COLOR[t.difficulty];
              return (
                <button
                  key={t.id}
                  data-testid={`button-track-${t.id}`}
                  onClick={() => { if (!locked) setSelectedTrack(t.id); }}
                  disabled={locked}
                  className="py-3 px-4 rounded-xl font-bold text-sm transition-all text-left relative overflow-hidden"
                  style={{
                    background: locked
                      ? "rgba(255,255,255,0.02)"
                      : isSelected ? `${t.neonColor}1a` : "rgba(255,255,255,0.03)",
                    border: `2px solid ${locked ? "rgba(255,255,255,0.06)" : isSelected ? t.neonColor : "rgba(255,255,255,0.1)"}`,
                    color: locked ? "rgba(255,255,255,0.2)" : isSelected ? t.neonColor : "rgba(255,255,255,0.6)",
                    boxShadow: isSelected && !locked ? `0 0 20px ${t.neonColor}30` : "none",
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                      style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">🔒</span>
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Level {t.unlockLevel}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="font-black uppercase tracking-wide text-sm">{t.name}</div>
                  <div className="text-xs mt-0.5 opacity-70">{t.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded"
                      style={{ background: diffColor + "22", color: diffColor, border: `1px solid ${diffColor}50` }}
                    >
                      {t.difficulty}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start button */}
        <button
          data-testid="button-start-race"
          onClick={handleStart}
          disabled={(TRACKS.find(t => t.id === selectedTrack)?.unlockLevel ?? 1) > playerLevel}
          className="py-4 rounded-xl font-black text-xl uppercase tracking-widest transition-all"
          style={{
            background: neon,
            color: "#000",
            boxShadow: `0 0 30px ${neon}60`,
            cursor: "pointer",
          }}
        >
          Start Race
        </button>

        {/* Mini leaderboard */}
        <div
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-widest">
              Top Pilots — {track.name}
            </span>
            <button
              data-testid="button-full-leaderboard"
              onClick={() => setLocation("/leaderboard?track=" + selectedTrack)}
              className="text-xs uppercase tracking-widest transition-colors"
              style={{ color: neon }}
            >
              View All
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-3 text-gray-500 text-sm">Loading...</div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-3 text-gray-500 text-sm">No records yet. Be the first!</div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg"
                  style={{
                    background: i === 0 ? `${neon}12` : "transparent",
                    border: i === 0 ? `1px solid ${neon}30` : "none",
                  }}
                >
                  <span
                    className="text-sm font-black w-6 text-center"
                    style={{ color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.4)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-bold text-sm text-white">{entry.playerName}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: neon }}>
                    {formatTime(entry.bestLapMs)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
