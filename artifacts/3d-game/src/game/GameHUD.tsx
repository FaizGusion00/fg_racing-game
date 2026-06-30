import { useMemo } from "react";
import { GamePhase } from "./useRaceState";
import { TOTAL_LAPS, TrackConfig, buildCurve } from "./trackData";
import { LEVEL_TITLES } from "./usePlayerProfile";

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
    const pts = curve.getPoints(120);
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
    <div
      className="relative w-32 h-32 rounded-xl overflow-hidden"
      style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${neonColor}40` }}
    >
      <div className="absolute top-1 left-2 text-xs font-bold uppercase" style={{ color: neonColor + "99", fontSize: "9px", letterSpacing: "0.1em" }}>
        MAP
      </div>
      <svg viewBox={`0 0 ${pathData.viewSize} ${pathData.viewSize}`} width="100%" height="100%">
        {/* Track outline */}
        <path d={pathData.d} fill="none" stroke={neonColor} strokeWidth="3.5" opacity="0.35" strokeLinejoin="round" />
        {/* Track center line */}
        <path d={pathData.d} fill="none" stroke={neonColor} strokeWidth="1.5" opacity="0.7" strokeLinejoin="round" />
        {/* Car blip */}
        <circle cx={pathData.carX} cy={pathData.carY} r="5" fill={neonColor} opacity="0.9" filter="url(#mmglow)" />
        <circle cx={pathData.carX} cy={pathData.carY} r="2.5" fill="white" />
        <defs>
          <filter id="mmglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
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
  playerLevel: number;
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
  playerLevel,
}: GameHUDProps) {
  const neon = track.neonColor;
  const displaySpeed = Math.round(Math.abs(speed));
  const levelTitle = LEVEL_TITLES[playerLevel] ?? "Rookie";

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ zIndex: 10 }}>

      {/* Countdown overlay */}
      {phase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-9xl font-black"
            style={{
              color: neon,
              textShadow: `0 0 40px ${neon}, 0 0 80px ${neon}80`,
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
            className="text-8xl font-black tracking-widest"
            style={{
              color: "#ffff00",
              textShadow: "0 0 40px #ffff00, 0 0 80px #ffff0060",
            }}
          >
            GO!
          </div>
        </div>
      )}

      {/* Top center bar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.75)", border: `1px solid ${neon}40`, backdropFilter: "blur(6px)" }}
      >
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest" style={{ fontSize: "10px" }}>Lap</div>
          <div className="text-xl font-black" style={{ color: neon }}>
            {currentLap}&nbsp;<span className="text-gray-500 font-normal">/ {TOTAL_LAPS}</span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest" style={{ fontSize: "10px" }}>Race Time</div>
          <div className="text-xl font-black font-mono" style={{ color: neon }}>
            {formatTime(totalTimeMs)}
          </div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest" style={{ fontSize: "10px" }}>Lap Time</div>
          <div className="text-lg font-mono text-white">
            {formatTime(currentLapMs)}
          </div>
        </div>
      </div>

      {/* Bottom left: Speed + Boost + Level */}
      <div className="absolute bottom-6 left-6 flex flex-col items-start gap-2">
        {/* Level badge */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-lg"
          style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${neon}30` }}
        >
          <span className="text-xs font-black" style={{ color: neon + "aa", letterSpacing: "0.1em" }}>LVL</span>
          <span className="text-sm font-black" style={{ color: neon }}>{playerLevel}</span>
          <span className="text-xs" style={{ color: neon + "66" }}>— {levelTitle}</span>
        </div>

        {/* Speed gauge */}
        <div
          className="flex flex-col items-center px-5 py-3 rounded-xl"
          style={{ background: "rgba(0,0,0,0.82)", border: `1px solid ${neon}35` }}
        >
          <div className="text-5xl font-black font-mono tabular-nums" style={{ color: neon, textShadow: `0 0 20px ${neon}60` }}>
            {displaySpeed}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">km/h</div>
          {/* Speed bar */}
          <div className="w-full mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (displaySpeed / 320) * 100)}%`,
                background: isBoostActive ? "#ff8800" : neon,
                boxShadow: `0 0 6px ${isBoostActive ? "#ff8800" : neon}`,
              }}
            />
          </div>
        </div>

        {/* Boost indicator */}
        {isBoostActive && (
          <div
            className="px-4 py-2 rounded-lg font-black text-sm uppercase tracking-widest"
            style={{
              background: "linear-gradient(90deg, #ff6600, #ff9900)",
              color: "#000",
              boxShadow: "0 0 24px #ff880080",
              animation: "pulse 0.35s ease-in-out infinite alternate",
            }}
          >
            ⚡ BOOST ACTIVE
          </div>
        )}
      </div>

      {/* Bottom right: Mini map */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
        <MiniMap track={track} carT={carT} />
      </div>

      {/* Top right: Lap splits */}
      {lapTimes.length > 0 && (
        <div className="absolute top-16 right-4 flex flex-col gap-1">
          {lapTimes.map((t, i) => {
            const best = Math.min(...lapTimes);
            const isBest = t === best;
            return (
              <div
                key={i}
                className="text-xs font-mono px-3 py-1 rounded-lg flex items-center gap-2"
                style={{
                  background: isBest ? `${neon}18` : "rgba(0,0,0,0.6)",
                  border: isBest ? `1px solid ${neon}50` : "1px solid rgba(255,255,255,0.06)",
                  color: isBest ? neon : "rgba(255,255,255,0.55)",
                }}
              >
                {isBest && <span style={{ color: "#ffdd00" }}>⚡</span>}
                <span>Lap {i + 1}</span>
                <span className="ml-1 font-bold">{formatTime(t)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls hint during countdown */}
      {phase === "countdown" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 text-center tracking-widest">
          W / ↑ &nbsp;Accelerate &nbsp;·&nbsp; S / ↓ &nbsp;Brake &nbsp;·&nbsp; A / D &nbsp;Steer
        </div>
      )}

      {/* Track name top left */}
      <div
        className="absolute top-4 left-4 px-3 py-2 rounded-lg"
        style={{ background: "rgba(0,0,0,0.65)", border: `1px solid ${neon}30` }}
      >
        <div className="text-xs uppercase tracking-widest font-bold" style={{ color: neon + "cc", fontSize: "10px" }}>Track</div>
        <div className="text-sm font-black text-white">{track.name}</div>
      </div>
    </div>
  );
}
