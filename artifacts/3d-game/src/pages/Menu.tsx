import { useState } from "react";
import { useLocation } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { TRACKS } from "@/game/trackData";

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return "--:--.---";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function Menu() {
  const [, setLocation] = useLocation();
  const [playerName, setPlayerName] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0].id);

  const track = TRACKS.find((t) => t.id === selectedTrack) ?? TRACKS[0];
  const neon = track.neonColor;

  const { data: leaderboard, isLoading } = useGetLeaderboard({
    trackId: selectedTrack,
    limit: 5,
  });

  const handleStart = () => {
    if (!playerName.trim()) return;
    setLocation(
      `/race?track=${encodeURIComponent(selectedTrack)}&player=${encodeURIComponent(playerName.trim())}`
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

      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: neon }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
        style={{ background: neon }}
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col gap-8">
        {/* Title */}
        <div className="text-center">
          <h1
            className="text-6xl font-black uppercase tracking-[0.2em] mb-2"
            style={{
              color: neon,
              textShadow: `0 0 30px ${neon}, 0 0 80px ${neon}60`,
            }}
          >
            APEX RUSH
          </h1>
          <p className="text-gray-400 text-sm uppercase tracking-widest">
            Futuristic Racing
          </p>
        </div>

        {/* Player name */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-widest">
            Pilot Name
          </label>
          <input
            data-testid="input-player-name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="Enter your name..."
            maxLength={20}
            className="px-5 py-3 rounded-xl text-white font-bold text-lg outline-none transition-all placeholder:text-gray-600"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${neon}50`,
              boxShadow: playerName ? `0 0 15px ${neon}20` : "none",
            }}
          />
        </div>

        {/* Track selection */}
        <div className="flex flex-col gap-3">
          <label className="text-xs text-gray-400 uppercase tracking-widest">
            Select Track
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                data-testid={`button-track-${t.id}`}
                onClick={() => setSelectedTrack(t.id)}
                className="py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
                style={{
                  background:
                    selectedTrack === t.id
                      ? `${t.neonColor}22`
                      : "rgba(255,255,255,0.03)",
                  border: `2px solid ${selectedTrack === t.id ? t.neonColor : "rgba(255,255,255,0.1)"}`,
                  color: selectedTrack === t.id ? t.neonColor : "rgba(255,255,255,0.5)",
                  boxShadow: selectedTrack === t.id ? `0 0 20px ${t.neonColor}30` : "none",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          data-testid="button-start-race"
          onClick={handleStart}
          disabled={!playerName.trim()}
          className="py-4 rounded-xl font-black text-xl uppercase tracking-widest transition-all"
          style={{
            background: playerName.trim() ? neon : "rgba(255,255,255,0.1)",
            color: playerName.trim() ? "#000" : "rgba(255,255,255,0.3)",
            boxShadow: playerName.trim() ? `0 0 30px ${neon}60` : "none",
            cursor: playerName.trim() ? "pointer" : "not-allowed",
          }}
        >
          Start Race
        </button>

        {/* Mini leaderboard */}
        <div
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
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
            <div className="text-center py-3 text-gray-500 text-sm">
              No records yet. Be the first!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div
                  key={entry.id}
                  data-testid={`leaderboard-entry-${entry.id}`}
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
                  <span className="flex-1 font-bold text-sm text-white">
                    {entry.playerName}
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: neon }}
                  >
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
