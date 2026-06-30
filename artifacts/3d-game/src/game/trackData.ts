import * as THREE from "three";

export interface TrackConfig {
  id: string;
  name: string;
  neonColor: string;
  groundColor: string;
  fogColor: string;
  controlPoints: [number, number, number][];
}

export const TRACK_WIDTH = 14;
export const TOTAL_LAPS = 3;

export const TRACKS: TrackConfig[] = [
  {
    id: "neon-city",
    name: "Neon City",
    neonColor: "#00ffff",
    groundColor: "#050a14",
    fogColor: "#050a14",
    controlPoints: [
      [0, 2, 0],
      [40, 2, -18],
      [78, 2, -5],
      [98, 2, 30],
      [90, 2, 68],
      [62, 2, 95],
      [20, 2, 108],
      [-22, 2, 98],
      [-58, 2, 72],
      [-72, 2, 32],
      [-52, 2, -5],
      [-18, 2, -12],
    ],
  },
  {
    id: "crystal-canyon",
    name: "Crystal Canyon",
    neonColor: "#dd00ff",
    groundColor: "#0a0514",
    fogColor: "#0a0514",
    controlPoints: [
      [0, 1, 0],
      [32, 3, -28],
      [72, 1, -18],
      [96, 2, 18],
      [88, 3, 56],
      [58, 1, 88],
      [12, 2, 100],
      [-28, 3, 88],
      [-58, 1, 56],
      [-72, 2, 18],
      [-48, 3, -18],
      [-18, 1, -28],
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
