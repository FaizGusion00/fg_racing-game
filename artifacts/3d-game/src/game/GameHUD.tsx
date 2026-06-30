import { useMemo } from "react";
import * as THREE from "three";
import { GamePhase } from "./useRaceState";
import { TOTAL_LAPS, TrackConfig, buildCurve, TRACK_WIDTH } from "./trackData";

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00.000";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

interface MiniMapProps {
  track: TrackConfig;
  carT: number;
}

function MiniMap({ track, carT }: MiniMapProps) {
  const pathData = useMemo(() => {
    const curve = buildCurve(track);
    const pts = curve.getPoints(100);
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const size = 90;
    const pad = 8;
    const mapped = pts.map((p) => ({
      x: pad + ((p.x - minX) / rangeX) * size,
      y: pad + ((p.z - minZ) / rangeZ) * size,
    }));

    const carPt = curve.getPoint(carT);
    const carX = pad + ((carPt.x - minX) / rangeX) * size;
    const carY = pad + ((carPt.z - minZ) / rangeZ) * size;

    const d =
      "M " +
      mapped.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ") +
      " Z";

    return { d, carX, carY, viewSize: size + pad * 2 };
  }, [track, carT]);

  const neonColor = track.neonColor;

  return (
    <div className="relative w-28 h-28 rounded-md overflow-hidden"
      style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${neonColor}40` }}>
      <svg
        viewBox={`0 0 ${pathData.viewSize} ${pathData.viewSize}`}
        width="100%"
        height="100%"
      >
        <path
          d={pathData.d}
          fill="none"
          stroke={neonColor}
          strokeWidth="3"
          opacity="0.7"
        />
        <circle
          cx={pathData.carX}
          cy={pathData.carY}
          r="4"
          fill={neonColor}
          filter="url(#glow)"
        />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

interface GameHUDProps {
  phase: GamePhase;
  countdown: number;
  currentLap: number;
  speed: number;
  isBoostActive: boolean;
  totalTimeMs: number;
  currentLapMs: number;
  lapTimes: number[];
  track: TrackConfig;
  carT: number;
}

export default function GameHUD({
  phase,
  countdown,
  currentLap,
  speed,
  isBoostActive,
  totalTimeMs,
  currentLapMs,
  lapTimes,
  track,
  carT,
}: GameHUDProps) {
  const neon = track.neonColor;
  const displaySpeed = Math.round(Math.abs(speed));

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ zIndex: 10 }}>
      {/* Countdown overlay */}
      {phase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-9xl font-black"
            style={{
              color: neon,
              textShadow: `0 0 30px ${neon}, 0 0 60px ${neon}`,
              animation: "pulse 0.8s ease-out",
            }}
          >
            {countdown}
          </div>
        </div>
      )}
      {phase === "countdown" && countdown === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-7xl font-black tracking-widest"
            style={{
              color: "#ffff00",
              textShadow: "0 0 30px #ffff00, 0 0 60px #ffff00",
            }}
          >
            GO!
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${neon}40` }}>
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest">Lap</div>
          <div className="text-2xl font-bold" style={{ color: neon }}>
            {currentLap} / {TOTAL_LAPS}
          </div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest">Race Time</div>
          <div className="text-2xl font-bold font-mono" style={{ color: neon }}>
            {formatTime(totalTimeMs)}
          </div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest">Lap Time</div>
          <div className="text-xl font-mono text-white">
            {formatTime(currentLapMs)}
          </div>
        </div>
      </div>

      {/* Speed + boost (bottom left) */}
      <div className="absolute bottom-6 left-6 flex flex-col items-start gap-3">
        <div className="flex flex-col items-center px-5 py-3 rounded-xl"
          style={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${neon}30` }}>
          <div className="text-5xl font-black font-mono" style={{ color: neon }}>
            {displaySpeed}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-widest">km/h</div>
        </div>
        {isBoostActive && (
          <div className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest"
            style={{
              background: "#ff8800",
              color: "#000",
              boxShadow: "0 0 20px #ff8800",
              animation: "pulse 0.4s ease-in-out infinite",
            }}>
            BOOST ACTIVE
          </div>
        )}
      </div>

      {/* Mini map (bottom right) */}
      <div className="absolute bottom-6 right-6">
        <MiniMap track={track} carT={carT} />
      </div>

      {/* Lap times (top right) */}
      {lapTimes.length > 0 && (
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          {lapTimes.map((t, i) => (
            <div key={i} className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: "rgba(0,0,0,0.6)", color: neon }}>
              Lap {i + 1}: {formatTime(t)}
            </div>
          ))}
        </div>
      )}

      {/* Controls hint */}
      {phase === "countdown" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 text-center">
          W / Up — Accelerate &nbsp;|&nbsp; S / Down — Brake &nbsp;|&nbsp; A / D — Steer
        </div>
      )}
    </div>
  );
}
