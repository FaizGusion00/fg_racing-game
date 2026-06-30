import { useState, useCallback, useRef } from "react";
import { TOTAL_LAPS } from "./trackData";

export type GamePhase = "countdown" | "racing" | "finished";

export function useRaceState() {
  const [phase, setPhase] = useState<GamePhase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [currentLap, setCurrentLap] = useState(1);
  const [lapTimes, setLapTimes] = useState<number[]>([]);
  const [speed, setSpeed] = useState(0);
  const [isBoostActive, setIsBoostActive] = useState(false);

  const lapStartRef = useRef<number>(0);
  const raceStartRef = useRef<number>(0);
  const boostEndRef = useRef<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);
    setCurrentLap(1);
    setLapTimes([]);
    setIsBoostActive(false);

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownRef.current!);
        const now = Date.now();
        lapStartRef.current = now;
        raceStartRef.current = now;
        setPhase("racing");
      }
    }, 1000);
  }, []);

  const completeLap = useCallback((): boolean => {
    const now = Date.now();
    const lapTime = now - lapStartRef.current;
    lapStartRef.current = now;

    let finished = false;
    setLapTimes((prev) => {
      const next = [...prev, lapTime];
      return next;
    });

    setCurrentLap((prev) => {
      if (prev >= TOTAL_LAPS) {
        setPhase("finished");
        finished = true;
        return prev;
      }
      return prev + 1;
    });

    return finished;
  }, []);

  const activateBoost = useCallback(() => {
    setIsBoostActive(true);
    boostEndRef.current = Date.now() + 3000;
  }, []);

  const tickBoost = useCallback(() => {
    if (boostEndRef.current > 0 && Date.now() > boostEndRef.current) {
      setIsBoostActive(false);
      boostEndRef.current = 0;
    }
  }, []);

  const getTotalTimeMs = useCallback((currentLapTimes: number[]) => {
    if (raceStartRef.current === 0) return 0;
    return Date.now() - raceStartRef.current;
  }, []);

  const getBestLapMs = useCallback((currentLapTimes: number[]) => {
    if (currentLapTimes.length === 0) return 0;
    return Math.min(...currentLapTimes);
  }, []);

  const getCurrentLapMs = useCallback(() => {
    if (lapStartRef.current === 0) return 0;
    return Date.now() - lapStartRef.current;
  }, []);

  const getRaceStartMs = () => raceStartRef.current;

  return {
    phase,
    countdown,
    currentLap,
    lapTimes,
    speed,
    setSpeed,
    isBoostActive,
    startCountdown,
    completeLap,
    activateBoost,
    tickBoost,
    getTotalTimeMs,
    getBestLapMs,
    getCurrentLapMs,
    getRaceStartMs,
  };
}
