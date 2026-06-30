import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Stars } from "@react-three/drei";
import { useLocation, useSearch } from "wouter";
import { useSubmitScore } from "@workspace/api-client-react";
import Track from "@/game/Track";
import Car from "@/game/Car";
import BoostPads from "@/game/BoostPad";
import GameHUD from "@/game/GameHUD";
import { useRaceState } from "@/game/useRaceState";
import { getTrackById, TOTAL_LAPS } from "@/game/trackData";
import { useAuth } from "@/auth/AuthContext";
import { computeXpReward, LEVEL_TITLES, getLevelProgress } from "@/game/usePlayerProfile";
import type { PlayerProfile } from "@/auth/AuthContext";
import * as THREE from "three";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

const KEY_MAP = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00.000";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function Race() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const trackId = params.get("track") ?? "neon-city";
  const playerName = params.get("player") ?? "Racer";
  const track = getTrackById(trackId);

  const carTRef = useRef<number>(0);
  const [carTDisplay, setCarTDisplay] = useState(0);
  const raceState = useRaceState();
  const submitScore = useSubmitScore();
  const { profile, user, updateProfileAfterRace } = useAuth();

  const [totalTimeSample, setTotalTimeSample] = useState(0);
  const [currentLapSample, setCurrentLapSample] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState<PlayerProfile | null>(null);
  const [xpReward, setXpReward] = useState<{ xpGained: number; leveledUp: boolean; personalBest: boolean } | null>(null);

  useEffect(() => {
    raceState.startCountdown();
  }, []);

  useEffect(() => {
    let id: number;
    const tick = () => {
      setTotalTimeSample(raceState.getTotalTimeMs(raceState.lapTimes));
      setCurrentLapSample(raceState.getCurrentLapMs());
      setCarTDisplay(carTRef.current);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [raceState]);

  useEffect(() => {
    if (raceState.phase === "finished") {
      setShowFinish(true);
      const totalMs = raceState.lapTimes.reduce((a, b) => a + b, 0);
      const bestMs = raceState.getBestLapMs(raceState.lapTimes);

      // Compute local XP reward
      const fakeProfile = {
        level: profile?.level ?? 1,
        xp: profile?.xp ?? 0,
        totalRaces: profile?.totalRaces ?? 0,
        personalBests: profile?.personalBests ?? {},
      };
      const { xpGained, personalBestBeaten } = computeXpReward(
        fakeProfile, trackId, bestMs, totalMs, raceState.lapTimes.length, TOTAL_LAPS
      );
      setXpReward({ xpGained, leveledUp: false, personalBest: personalBestBeaten });

      // Save to server
      updateProfileAfterRace({
        xpGained,
        trackId,
        bestLapMs: bestMs,
        totalTimeMs: totalMs,
        lapsCompleted: raceState.lapTimes.length,
      }).then((updated) => {
        if (updated) {
          setUpdatedProfile(updated);
          const didLevelUp = updated.level > (profile?.level ?? 1);
          setXpReward((prev) => prev ? { ...prev, leveledUp: didLevelUp } : null);
        }
      });
    }
  }, [raceState.phase]);

  const handleLapComplete = useCallback(() => {
    raceState.completeLap();
  }, [raceState]);

  const handleSubmit = useCallback(() => {
    const totalMs = raceState.lapTimes.reduce((a, b) => a + b, 0);
    const bestMs = raceState.getBestLapMs(raceState.lapTimes);
    submitScore.mutate(
      {
        data: {
          playerName: user?.username ?? playerName,
          trackId,
          totalTimeMs: totalMs,
          bestLapMs: bestMs,
          lapsCompleted: raceState.lapTimes.length,
        },
      },
      { onSuccess: () => setSubmitted(true) }
    );
  }, [raceState, playerName, trackId, submitScore, user]);

  const neon = track.neonColor;
  const displayProfile = updatedProfile ?? profile;
  const xpProgress = displayProfile ? getLevelProgress(displayProfile).progress : 0;

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ fov: 72, near: 0.1, far: 2000, position: [0, 12, 20] }}
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={[track.fogColor as THREE.ColorRepresentation]} />
          <fog attach="fog" args={[track.fogColor, track.fogNear, track.fogFar]} />

          <ambientLight intensity={0.2} />
          <directionalLight position={[50, 80, 50]} intensity={0.9} castShadow shadow-mapSize={[2048, 2048]} />
          <pointLight position={[0, 30, 0]} intensity={2.5} color={neon} distance={220} />

          <Stars radius={220} depth={60} count={4000} factor={4} fade />

          <Track track={track} groundColor={track.groundColor} />

          <BoostPads
            track={track}
            carTRef={carTRef}
            onBoost={raceState.activateBoost}
            active={raceState.phase === "racing"}
          />

          <Car
            track={track}
            phase={raceState.phase}
            isBoostActive={raceState.isBoostActive}
            onLapComplete={handleLapComplete}
            onSpeedChange={raceState.setSpeed}
            carTRef={carTRef}
            onBoostTick={raceState.tickBoost}
            playerLevel={profile?.level ?? 1}
          />
        </Canvas>
      </KeyboardControls>

      <GameHUD
        phase={raceState.phase}
        countdown={raceState.countdown}
        currentLap={raceState.currentLap}
        speed={raceState.speed}
        isBoostActive={raceState.isBoostActive}
        totalTimeMs={totalTimeSample}
        currentLapMs={currentLapSample}
        lapTimes={raceState.lapTimes}
        track={track}
        carT={carTDisplay}
        playerLevel={profile?.level ?? 1}
      />

      {/* Race finished overlay */}
      {showFinish && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)", zIndex: 20 }}>
          <div
            className="w-full max-w-md p-8 rounded-2xl flex flex-col gap-5 overflow-y-auto"
            style={{
              background: "rgba(5,10,30,0.97)",
              border: `2px solid ${neon}`,
              boxShadow: `0 0 40px ${neon}40`,
              maxHeight: "90vh",
            }}
          >
            <h2 className="text-3xl font-black text-center uppercase tracking-widest" style={{ color: neon, textShadow: `0 0 20px ${neon}` }}>
              Race Complete
            </h2>

            {/* XP reward banner */}
            {xpReward && (
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: `${neon}18`, border: `1px solid ${neon}50` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-widest" style={{ color: neon }}>
                    +{xpReward.xpGained} XP Earned
                  </span>
                  {xpReward.personalBest && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#ffcc0022", color: "#ffcc00", border: "1px solid #ffcc0060" }}>
                      🏆 Personal Best!
                    </span>
                  )}
                </div>
                {xpReward.leveledUp && displayProfile && (
                  <div className="text-center font-black text-lg" style={{ color: "#ffdd00", textShadow: "0 0 20px #ffdd00" }}>
                    ⚡ LEVEL UP! → Level {displayProfile.level} — {LEVEL_TITLES[displayProfile.level]}
                  </div>
                )}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.round(xpProgress * 100)}%`,
                      background: `linear-gradient(90deg, ${neon}80, ${neon})`,
                      boxShadow: `0 0 8px ${neon}80`,
                    }}
                  />
                </div>
                <div className="text-xs text-center" style={{ color: neon + "88" }}>
                  Level {displayProfile?.level ?? 1} · {LEVEL_TITLES[displayProfile?.level ?? 1]}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Total Time" value={formatTime(raceState.lapTimes.reduce((a, b) => a + b, 0))} neon={neon} />
              <Stat label="Best Lap" value={formatTime(raceState.getBestLapMs(raceState.lapTimes))} neon={neon} />
              <Stat label="Laps" value={`${raceState.lapTimes.length} / ${TOTAL_LAPS}`} neon={neon} />
              <Stat label="Track" value={track.name} neon={neon} />
            </div>

            {raceState.lapTimes.length > 0 && (
              <div className="flex flex-col gap-1">
                {raceState.lapTimes.map((t, i) => {
                  const bestIdx = raceState.lapTimes.indexOf(Math.min(...raceState.lapTimes));
                  return (
                    <div key={i} className="flex justify-between text-sm font-mono"
                      style={{ color: i === bestIdx ? "#ffdd00" : "rgba(255,255,255,0.6)" }}>
                      <span>Lap {i + 1}</span>
                      <span>{i === bestIdx ? "⚡ " : ""}{formatTime(t)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!submitted ? (
              <button
                data-testid="button-submit-score"
                onClick={handleSubmit}
                disabled={submitScore.isPending}
                className="py-3 rounded-xl font-black uppercase tracking-widest text-black transition-all"
                style={{ background: neon, opacity: submitScore.isPending ? 0.6 : 1 }}
              >
                {submitScore.isPending ? "Submitting..." : "Submit to Leaderboard"}
              </button>
            ) : (
              <div className="text-center font-bold py-2" style={{ color: neon }}>
                ✓ Score Submitted
              </div>
            )}

            <div className="flex gap-3">
              <button
                data-testid="button-race-again"
                onClick={() => {
                  setShowFinish(false);
                  setSubmitted(false);
                  setXpReward(null);
                  setUpdatedProfile(null);
                  carTRef.current = 0;
                  raceState.startCountdown();
                }}
                className="flex-1 py-2 rounded-lg font-bold text-sm uppercase tracking-widest"
                style={{ border: `1px solid ${neon}60`, color: neon }}
              >
                Race Again
              </button>
              <button
                data-testid="button-view-leaderboard"
                onClick={() => setLocation("/leaderboard?track=" + trackId)}
                className="flex-1 py-2 rounded-lg font-bold text-sm uppercase tracking-widest text-white"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Leaderboard
              </button>
              <button
                data-testid="button-menu"
                onClick={() => setLocation("/")}
                className="flex-1 py-2 rounded-lg font-bold text-sm uppercase tracking-widest text-white"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, neon }: { label: string; value: string; neon: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-xs text-gray-400 uppercase tracking-widest">{label}</div>
      <div className="text-lg font-bold font-mono" style={{ color: neon }}>{value}</div>
    </div>
  );
}
