import * as THREE from "three";

export interface TrackConfig {
  id: string;
  name: string;
  description: string;
  neonColor: string;
  groundColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  unlockLevel: number;
  difficulty: "ROOKIE" | "PRO" | "ELITE" | "MASTER";
  controlPoints: [number, number, number][];
}

export const TRACK_WIDTH = 16;
export const TOTAL_LAPS = 3;

export const TRACKS: TrackConfig[] = [
  {
    id: "neon-city",
    name: "Neon City",
    description: "Wide sweeping turns above a glowing metropolis",
    neonColor: "#00ffff",
    groundColor: "#050a14",
    fogColor: "#050a14",
    fogNear: 100,
    fogFar: 420,
    unlockLevel: 1,
    difficulty: "ROOKIE",
    controlPoints: [
      [0, 2, 0],
      [45, 2, -20],
      [88, 2, -6],
      [112, 2, 32],
      [100, 2, 76],
      [65, 2, 108],
      [18, 2, 122],
      [-28, 2, 110],
      [-68, 2, 78],
      [-85, 2, 36],
      [-62, 2, -6],
      [-20, 2, -14],
    ],
  },
  {
    id: "crystal-canyon",
    name: "Crystal Canyon",
    description: "Winding canyon with elevation changes and tight hairpins",
    neonColor: "#dd00ff",
    groundColor: "#0a0514",
    fogColor: "#0a0514",
    fogNear: 80,
    fogFar: 350,
    unlockLevel: 1,
    difficulty: "PRO",
    controlPoints: [
      [0, 1, 0],
      [28, 5, -32],
      [65, 1, -24],
      [92, 6, 12],
      [85, 2, 55],
      [52, 7, 88],
      [8, 2, 102],
      [-32, 6, 90],
      [-62, 2, 58],
      [-76, 6, 18],
      [-52, 2, -20],
      [-20, 5, -30],
    ],
  },
  {
    id: "storm-viaduct",
    name: "Storm Viaduct",
    description: "High-altitude bridge racing through electric storms",
    neonColor: "#ffee00",
    groundColor: "#020508",
    fogColor: "#0a1020",
    fogNear: 60,
    fogFar: 280,
    unlockLevel: 4,
    difficulty: "ELITE",
    controlPoints: [
      [0, 12, 0],
      [55, 15, -8],
      [105, 10, 5],
      [130, 14, 45],
      [108, 11, 90],
      [65, 15, 120],
      [12, 10, 132],
      [-38, 14, 122],
      [-78, 11, 88],
      [-98, 15, 42],
      [-72, 10, -2],
      [-25, 14, -10],
    ],
  },
  {
    id: "quantum-spiral",
    name: "Quantum Spiral",
    description: "Relentless hairpins and technical corners at terminal speed",
    neonColor: "#ff4400",
    groundColor: "#0e0500",
    fogColor: "#0e0500",
    fogNear: 50,
    fogFar: 250,
    unlockLevel: 8,
    difficulty: "MASTER",
    controlPoints: [
      [0, 2, 0],
      [22, 6, -26],
      [52, 2, -34],
      [76, 7, -14],
      [88, 3, 22],
      [74, 8, 52],
      [44, 2, 70],
      [8, 7, 72],
      [-24, 2, 56],
      [-42, 6, 26],
      [-36, 2, -4],
      [-14, 6, -20],
    ],
  },
];

export function buildCurve(track: TrackConfig): THREE.CatmullRomCurve3 {
  const points = track.controlPoints.map(
    ([x, y, z]) => new THREE.Vector3(x, y, z)
  );
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.5);
}

export function getTrackById(id: string): TrackConfig {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export const DIFFICULTY_COLOR: Record<string, string> = {
  ROOKIE: "#00ff88",
  PRO: "#ffcc00",
  ELITE: "#ff8800",
  MASTER: "#ff2200",
};
