import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useLocation, useSearch } from "wouter";
import { useSubmitScore } from "@workspace/api-client-react";
import Track from "@/game/Track";
import Car from "@/game/Car";
import BoostPads from "@/game/BoostPad";
import GameHUD from "@/game/GameHUD";
import { useRaceState, GamePhase } from "@/game/useRaceState";
import { getTrackById, TOTAL_LAPS } from "@/game/trackData";

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

  const [totalTimeSample, setTotalTimeSample] = useState(0);
  const [currentLapSample, setCurrentLapSample] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(playerName);
  const [submitted, setSubmitted] = useState(false);
  const animFrame = useRef<number>(0);

  // Start countdown on mount
  useEffect(() => {
    raceState.startCountdown();
  }, []);

  // UI clock — update HUD every animation frame
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

  // Show finish overlay when race done
  useEffect(() => {
    if (raceState.phase === "finished") {
      setShowFinish(true);
    }
  }, [raceState.phase]);

  const handleLapComplete = useCallback(() => {
    const isFinished = raceState.completeLap();
  }, [raceState]);

  const handleSubmit = useCallback(() => {
    const totalMs = raceState.lapTimes.reduce((a, b) => a + b, 0);
    const bestMs = raceState.getBestLapMs(raceState.lapTimes);
    submitScore.mutate(
      {
        data: {
          playerName: playerNameInput.trim() || "Racer",
          trackId,
          totalTimeMs: totalMs,
          bestLapMs: bestMs,
          lapsCompleted: raceState.lapTimes.length,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      }
    );
  }, [raceState, playerNameInput, trackId, submitScore]);

  const neon = track.neonColor;

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      <KeyboardControls map={KEY_MAP}>
        <Canvas
          shadows
          camera={{ fov: 75, near: 0.1, far: 2000, position: [0, 12, 20] }}
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={[track.fogColor]} />
          <fog attach="fog" args={[track.fogColor, 80, 350]} />

          <ambientLight intensity={0.25} />
          <directionalLight
            position={[50, 80, 50]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[0, 30, 0]} intensity={2} color={neon} distance={200} />

          <Stars radius={200} depth={60} count={3000} factor={4} fade />

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
          />
        </Canvas>
      </KeyboardControls>

      {/* HUD */}
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
      />

      {/* Race finished overlay */}
      {showFinish && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 20 }}
        >
          <div
            className="w-full max-w-md p-8 rounded-2xl flex flex-col gap-6"
            style={{
              background: "rgba(5,10,30,0.97)",
              border: `2px solid ${neon}`,
              boxShadow: `0 0 40px ${neon}40`,
            }}
          >
            <h2
              className="text-3xl font-black text-center uppercase tracking-widest"
              style={{ color: neon, textShadow: `0 0 20px ${neon}` }}
            >
              Race Complete
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total Time" value={formatTime(raceState.lapTimes.reduce((a, b) => a + b, 0))} neon={neon} />
              <Stat label="Best Lap" value={formatTime(raceState.getBestLapMs(raceState.lapTimes))} neon={neon} />
              <Stat label="Laps" value={`${raceState.lapTimes.length} / ${TOTAL_LAPS}`} neon={neon} />
              <Stat label="Track" value={track.name} neon={neon} />
            </div>

            {raceState.lapTimes.length > 0 && (
              <div className="flex flex-col gap-1">
                {raceState.lapTimes.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm font-mono"
                    style={{ color: i === raceState.lapTimes.indexOf(Math.min(...raceState.lapTimes)) ? "#ffdd00" : "rgba(255,255,255,0.6)" }}>
                    <span>Lap {i + 1}</span>
                    <span>{formatTime(t)}</span>
                  </div>
                ))}
              </div>
            )}

            {!submitted ? (
              <div className="flex flex-col gap-3">
                <label className="text-xs text-gray-400 uppercase tracking-widest">Your Name</label>
                <input
                  data-testid="input-player-name"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  maxLength={20}
                  className="px-4 py-2 rounded-lg text-white font-bold text-center outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${neon}60`,
                  }}
                />
                <button
                  data-testid="button-submit-score"
                  onClick={handleSubmit}
                  disabled={submitScore.isPending}
                  className="py-3 rounded-xl font-black uppercase tracking-widest text-black transition-all"
                  style={{ background: neon, opacity: submitScore.isPending ? 0.6 : 1 }}
                >
                  {submitScore.isPending ? "Submitting..." : "Submit Score"}
                </button>
              </div>
            ) : (
              <div className="text-center text-green-400 font-bold">Score submitted!</div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                data-testid="button-race-again"
                onClick={() => {
                  setShowFinish(false);
                  setSubmitted(false);
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
