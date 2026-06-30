import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { TRACKS } from "@/game/trackData";

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return "--:--.---";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTrack = params.get("track") ?? TRACKS[0].id;
  const [selectedTrack, setSelectedTrack] = useState(initialTrack);

  const track = TRACKS.find((t) => t.id === selectedTrack) ?? TRACKS[0];
  const neon = track.neonColor;

  const { data: entries, isLoading } = useGetLeaderboard({
    trackId: selectedTrack,
    limit: 50,
  });

  const rankColor = (i: number) =>
    i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.4)";

  return (
    <div
      className="min-h-screen flex flex-col p-6 relative"
      style={{ background: "#050814" }}
    >
      {/* Grid bg */}
      <div
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(${neon}50 1px, transparent 1px), linear-gradient(90deg, ${neon}50 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/")}
            className="text-sm uppercase tracking-widest transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Back
          </button>
          <div className="flex-1" />
          <h1
            className="text-3xl font-black uppercase tracking-widest"
            style={{ color: neon, textShadow: `0 0 20px ${neon}` }}
          >
            Leaderboard
          </h1>
        </div>

        {/* Track tabs */}
        <div className="flex gap-3">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              data-testid={`tab-track-${t.id}`}
              onClick={() => setSelectedTrack(t.id)}
              className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
              style={{
                background:
                  selectedTrack === t.id
                    ? `${t.neonColor}22`
                    : "rgba(255,255,255,0.03)",
                border: `2px solid ${selectedTrack === t.id ? t.neonColor : "rgba(255,255,255,0.1)"}`,
                color: selectedTrack === t.id ? t.neonColor : "rgba(255,255,255,0.4)",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${neon}30` }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-12 gap-2 px-5 py-3 text-xs uppercase tracking-widest text-gray-500"
            style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${neon}20` }}
          >
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Pilot</div>
            <div className="col-span-3 text-right">Best Lap</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-2 text-right">Date</div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              Loading records...
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="py-12 text-center flex flex-col gap-2">
              <div className="text-gray-400 font-bold">No records yet</div>
              <div className="text-gray-600 text-sm">Race to set the first record!</div>
              <button
                data-testid="button-race-now"
                onClick={() => setLocation("/")}
                className="mt-4 mx-auto px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-widest"
                style={{ background: neon, color: "#000" }}
              >
                Race Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  data-testid={`leaderboard-row-${entry.id}`}
                  className="grid grid-cols-12 gap-2 px-5 py-4 items-center transition-colors"
                  style={{
                    background: i === 0 ? `${neon}08` : "transparent",
                    borderBottom: i < entries.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}
                >
                  <div className="col-span-1 text-center">
                    <span className="font-black text-sm" style={{ color: rankColor(i) }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <div className="font-bold text-white text-sm">{entry.playerName}</div>
                    <div className="text-xs text-gray-500">
                      {entry.lapsCompleted} lap{entry.lapsCompleted !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span
                      className="font-mono font-bold text-sm"
                      style={{ color: neon }}
                    >
                      {formatTime(entry.bestLapMs)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono text-xs text-gray-400">
                      {formatTime(entry.totalTimeMs)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Race again */}
        <div className="flex justify-center">
          <button
            data-testid="button-race"
            onClick={() => setLocation("/")}
            className="px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all"
            style={{ background: neon, color: "#000", boxShadow: `0 0 20px ${neon}50` }}
          >
            Race
          </button>
        </div>
      </div>
    </div>
  );
}
