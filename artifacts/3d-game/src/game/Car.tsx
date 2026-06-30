import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { TrackConfig, TRACK_WIDTH, buildCurve } from "./trackData";
import { GamePhase } from "./useRaceState";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

const HALF_WIDTH = TRACK_WIDTH / 2 - 1.2;
const MAX_SPEED = 38;
const ACCELERATION = 22;
const BRAKE_FORCE = 40;
const FRICTION = 1.8;
const STEER_SPEED = 14;
const STEER_RETURN = 6;
const BOOST_MULTIPLIER = 1.9;

interface CarProps {
  track: TrackConfig;
  phase: GamePhase;
  isBoostActive: boolean;
  onLapComplete: () => void;
  onSpeedChange: (speed: number) => void;
  carTRef: React.RefObject<number>;
  onBoostTick: () => void;
}

export default function Car({
  track,
  phase,
  isBoostActive,
  onLapComplete,
  onSpeedChange,
  carTRef,
  onBoostTick,
}: CarProps) {
  const carGroupRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0);
  const lateralRef = useRef(0);
  const steerAngleRef = useRef(0);
  const prevTRef = useRef(0);
  const lapCooldownRef = useRef(false);

  const curve = useRef(buildCurve(track)).current;
  const trackLength = useRef(curve.getLength()).current;

  const [, getState] = useKeyboardControls<Controls>();

  const up = useRef(new THREE.Vector3(0, 1, 0)).current;
  const tmpTangent = useRef(new THREE.Vector3()).current;
  const tmpNormal = useRef(new THREE.Vector3()).current;
  const tmpPos = useRef(new THREE.Vector3()).current;
  const tmpLookTarget = useRef(new THREE.Vector3()).current;
  const tmpMatrix = useRef(new THREE.Matrix4()).current;
  const tmpCamTarget = useRef(new THREE.Vector3()).current;
  const tmpCamPos = useRef(new THREE.Vector3()).current;

  useFrame((state, delta) => {
    if (!carGroupRef.current) return;

    const controls = getState();
    const racing = phase === "racing";

    // ── Speed ──────────────────────────────────────────────────────────────
    if (racing && controls.forward) {
      speedRef.current = Math.min(
        speedRef.current + ACCELERATION * delta,
        MAX_SPEED
      );
    } else if (racing && controls.back) {
      speedRef.current = Math.max(
        speedRef.current - BRAKE_FORCE * delta,
        -MAX_SPEED * 0.3
      );
    } else {
      const friction = FRICTION * (racing ? 1 : 3);
      speedRef.current *= Math.max(0, 1 - friction * delta);
    }

    // Boost
    const effectiveSpeed = isBoostActive
      ? Math.min(speedRef.current * BOOST_MULTIPLIER, MAX_SPEED * BOOST_MULTIPLIER)
      : speedRef.current;

    // ── Lateral steering ───────────────────────────────────────────────────
    if (racing && controls.left) {
      lateralRef.current = Math.max(
        lateralRef.current - STEER_SPEED * delta,
        -HALF_WIDTH
      );
      steerAngleRef.current = Math.max(steerAngleRef.current - 2.5 * delta, -0.35);
    } else if (racing && controls.right) {
      lateralRef.current = Math.min(
        lateralRef.current + STEER_SPEED * delta,
        HALF_WIDTH
      );
      steerAngleRef.current = Math.min(steerAngleRef.current + 2.5 * delta, 0.35);
    } else {
      steerAngleRef.current *= Math.max(0, 1 - STEER_RETURN * delta);
    }

    // ── Advance t ──────────────────────────────────────────────────────────
    prevTRef.current = carTRef.current ?? 0;
    const newT = (carTRef.current ?? 0) + (effectiveSpeed * delta) / trackLength;

    // Lap detection: when t wraps past 1
    if (newT >= 1 && !lapCooldownRef.current) {
      lapCooldownRef.current = true;
      onLapComplete();
      setTimeout(() => {
        lapCooldownRef.current = false;
      }, 800);
    }

    (carTRef as React.MutableRefObject<number>).current =
      ((newT % 1) + 1) % 1;

    onBoostTick();

    // ── Position ───────────────────────────────────────────────────────────
    const t = (carTRef as React.MutableRefObject<number>).current;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();

    tmpNormal.crossVectors(up, tangent).normalize();

    tmpPos.copy(point);
    tmpPos.addScaledVector(tmpNormal, lateralRef.current);
    tmpPos.y += 0.65;

    carGroupRef.current.position.copy(tmpPos);

    // Rotation: face tangent direction, roll with steer
    tmpLookTarget.copy(tmpPos).addScaledVector(tangent, 1);
    tmpMatrix.lookAt(tmpPos, tmpLookTarget, up);
    carGroupRef.current.quaternion.setFromRotationMatrix(tmpMatrix);

    // Roll tilt when steering
    carGroupRef.current.rotateZ(-steerAngleRef.current * 0.4);

    // ── Camera ────────────────────────────────────────────────────────────
    const tBack = ((t - 0.04 + 1) % 1);
    const camTrackPt = curve.getPoint(tBack);
    const camOffset = new THREE.Vector3(0, 9, 0);
    camOffset.addScaledVector(tmpNormal, lateralRef.current * 0.5);

    tmpCamPos.copy(camTrackPt).add(camOffset);
    state.camera.position.lerp(tmpCamPos, 0.08);
    tmpCamTarget.copy(tmpPos).add(new THREE.Vector3(0, 1.5, 0));
    state.camera.lookAt(tmpCamTarget);

    // ── HUD speed update ─────────────────────────────────────────────────
    onSpeedChange(Math.abs(effectiveSpeed) * 4.8);
  });

  const neonColor = track.neonColor;
  const neonThree = new THREE.Color(neonColor);

  return (
    <group ref={carGroupRef}>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[2.0, 0.55, 4.0]} />
        <meshStandardMaterial
          color="#0a0a1a"
          roughness={0.2}
          metalness={0.9}
          emissive={neonThree}
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.45, -0.3]} castShadow>
        <boxGeometry args={[1.4, 0.4, 1.6]} />
        <meshStandardMaterial
          color="#050510"
          roughness={0.1}
          metalness={0.95}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Neon side strips */}
      {[-1.01, 1.01].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.06, 0.18, 3.8]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonThree}
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      {/* Front headlights */}
      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} position={[x, 0, 2.0]}>
          <boxGeometry args={[0.45, 0.15, 0.1]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonThree}
            emissiveIntensity={4}
          />
        </mesh>
      ))}

      {/* Rear glow */}
      <mesh position={[0, 0, -2.0]}>
        <boxGeometry args={[1.6, 0.2, 0.08]} />
        <meshStandardMaterial
          color="#ff2244"
          emissive={new THREE.Color("#ff2244")}
          emissiveIntensity={3}
        />
      </mesh>

      {/* Hover pods (4 corners) */}
      {[-0.7, 0.7].flatMap((x) =>
        [-1.4, 1.4].map((z, j) => (
          <mesh key={`${x}-${z}`} position={[x, -0.35, z]}>
            <cylinderGeometry args={[0.28, 0.22, 0.22, 8]} />
            <meshStandardMaterial
              color="#222"
              emissive={neonThree}
              emissiveIntensity={1.2}
            />
          </mesh>
        ))
      )}

      {/* Car point light */}
      <pointLight
        position={[0, 0.5, 2]}
        color={neonColor}
        intensity={8}
        distance={18}
      />
      <pointLight
        position={[0, -0.3, 0]}
        color={neonColor}
        intensity={3}
        distance={8}
      />
    </group>
  );
}
