import { useRef } from "react";
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

// ─── Physics constants ──────────────────────────────────────────────────────
const MAX_SPEED = 52;          // m/s top speed
const ACCEL_BASE = 26;         // base acceleration
const BRAKE_FORCE = 65;        // braking deceleration
const COAST_DRAG = 0.55;       // natural drag when no input
const ENGINE_DRAG_COEF = 0.28; // additional drag scaling with speed
const BOOST_MULT = 1.88;
const BOOST_MAX = MAX_SPEED * BOOST_MULT;

// Lateral physics
const LATERAL_ACCEL = 0.78;   // lateral velocity gain from steering per (speed unit * delta)
const LATERAL_GRIP = 0.88;    // fraction retained per frame (higher = less drift)
const MAX_LAT_VEL = 28;       // max lateral slide speed
const STEER_FILTER = 9.0;     // input smoothing speed (higher = snappier)
const WALL_BOUNCE = 0.38;     // velocity reflection on wall hit
const WALL_SPEED_LOSS = 0.82; // speed scrub on wall contact
const HALF_W = TRACK_WIDTH / 2 - 1.8;

// Camera
const CAM_BACK = 18;
const CAM_HEIGHT = 9;
const CAM_LAG = 0.055;
const CAM_LOOKAHEAD_T = 0.045;
const FOV_BASE = 72;
const FOV_SPEED_ADD = 10;
const FOV_BOOST_ADD = 14;
const FOV_LERP = 3.5;

// Visual
const BODY_ROLL_RATE = 7.0;
const MAX_BODY_ROLL = 0.32;

interface CarProps {
  track: TrackConfig;
  phase: GamePhase;
  isBoostActive: boolean;
  onLapComplete: () => void;
  onSpeedChange: (kmh: number) => void;
  carTRef: React.RefObject<number>;
  onBoostTick: () => void;
  playerLevel: number;
}

export default function Car({
  track,
  phase,
  isBoostActive,
  onLapComplete,
  onSpeedChange,
  carTRef,
  onBoostTick,
  playerLevel,
}: CarProps) {
  const carGroupRef = useRef<THREE.Group>(null);

  // Physics state
  const speedRef = useRef(0);
  const latVelRef = useRef(0);       // lateral velocity (m/s, + = right)
  const latPosRef = useRef(0);       // lateral position (m from center)
  const steerInputRef = useRef(0);   // filtered steering input −1..1
  const bodyRollRef = useRef(0);     // visual body roll angle
  const fovRef = useRef(FOV_BASE);
  const lapCooldownRef = useRef(false);

  // Level bonus: higher level = slightly better stats
  const levelBonus = 1 + (playerLevel - 1) * 0.018;

  const curve = useRef(buildCurve(track)).current;
  const trackLength = useRef(curve.getLength()).current;
  const [, getState] = useKeyboardControls<Controls>();

  // Reusable THREE objects — allocated once
  const up = useRef(new THREE.Vector3(0, 1, 0)).current;
  const tmpNorm = useRef(new THREE.Vector3()).current;
  const tmpPos = useRef(new THREE.Vector3()).current;
  const tmpLook = useRef(new THREE.Vector3()).current;
  const tmpMat = useRef(new THREE.Matrix4()).current;
  const tmpCamPos = useRef(new THREE.Vector3()).current;
  const tmpCamTgt = useRef(new THREE.Vector3()).current;
  const tmpLookAhead = useRef(new THREE.Vector3()).current;

  useFrame((state, delta) => {
    if (!carGroupRef.current) return;
    const dt = Math.min(delta, 0.05); // clamp to avoid physics blow-up on lag frames

    const ctrl = getState();
    const racing = phase === "racing";

    // ── 1. Steering input smoothing ──────────────────────────────────────────
    const rawSteer = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    steerInputRef.current +=
      (rawSteer - steerInputRef.current) * Math.min(1, STEER_FILTER * dt);

    // ── 2. Forward speed with realistic acceleration curve ───────────────────
    if (racing && ctrl.forward) {
      // Progressive: torque falls off as speed rises (torque curve approximation)
      const torqueFactor = Math.max(0.12, 1 - (speedRef.current / MAX_SPEED) * 0.75);
      speedRef.current += ACCEL_BASE * levelBonus * torqueFactor * dt;
    } else if (racing && ctrl.back) {
      // ABS-like braking: strong initial bite
      const brakePct = speedRef.current > 0 ? 1 : 0.35;
      speedRef.current -= BRAKE_FORCE * brakePct * dt;
      if (!ctrl.forward) speedRef.current = Math.max(speedRef.current, -MAX_SPEED * 0.25);
    } else if (racing) {
      // Coast with engine drag
      const drag = COAST_DRAG + ENGINE_DRAG_COEF * (speedRef.current / MAX_SPEED);
      speedRef.current *= Math.max(0, 1 - drag * dt);
    } else {
      // Pre-race or finished: strong deceleration
      speedRef.current *= Math.max(0, 1 - 4 * dt);
    }

    // Boost
    const boostedSpeed = isBoostActive
      ? Math.min(speedRef.current * BOOST_MULT, BOOST_MAX)
      : speedRef.current;
    const effectiveSpeed = Math.max(boostedSpeed, speedRef.current); // never slow down from boost calc

    // ── 3. Lateral (steering) physics ────────────────────────────────────────
    if (racing) {
      // Speed-sensitive understeer: lateral accel reduced at high speed
      const speedRatio = Math.min(Math.abs(effectiveSpeed) / MAX_SPEED, 1);
      const steerEffect = LATERAL_ACCEL * levelBonus * (1 - speedRatio * 0.38);
      latVelRef.current +=
        steerInputRef.current * Math.abs(effectiveSpeed) * steerEffect * dt;
    }
    latVelRef.current = Math.max(-MAX_LAT_VEL, Math.min(MAX_LAT_VEL, latVelRef.current));

    // Grip/friction decays lateral velocity toward 0
    const gripPow = Math.pow(LATERAL_GRIP, dt * 60);
    latVelRef.current *= gripPow;

    // Integrate lateral position
    latPosRef.current += latVelRef.current * dt;

    // ── 4. Track wall collision ──────────────────────────────────────────────
    if (Math.abs(latPosRef.current) > HALF_W) {
      const sign = Math.sign(latPosRef.current);
      latPosRef.current = sign * HALF_W;
      latVelRef.current *= -WALL_BOUNCE;
      speedRef.current *= WALL_SPEED_LOSS;
    }

    // ── 5. Advance track position ────────────────────────────────────────────
    const prevT = carTRef.current ?? 0;
    const tAdvance = (effectiveSpeed * dt) / trackLength;
    const newT = ((prevT + tAdvance) % 1 + 1) % 1;

    if (prevT > 0.9 && newT < 0.1 && !lapCooldownRef.current) {
      lapCooldownRef.current = true;
      onLapComplete();
      setTimeout(() => { lapCooldownRef.current = false; }, 900);
    }

    (carTRef as React.MutableRefObject<number>).current = newT;
    onBoostTick();

    // ── 6. World-space position & orientation ────────────────────────────────
    const t = newT;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();

    tmpNorm.crossVectors(up, tangent).normalize();

    tmpPos.copy(point);
    tmpPos.addScaledVector(tmpNorm, latPosRef.current);
    tmpPos.y += 0.72;

    carGroupRef.current.position.copy(tmpPos);

    // Face forward + body roll
    tmpLook.copy(tmpPos).addScaledVector(tangent, 1);
    tmpMat.lookAt(tmpPos, tmpLook, up);
    carGroupRef.current.quaternion.setFromRotationMatrix(tmpMat);

    const targetRoll = -latVelRef.current * 0.011;
    bodyRollRef.current +=
      (targetRoll - bodyRollRef.current) * Math.min(1, BODY_ROLL_RATE * dt);
    bodyRollRef.current = Math.max(-MAX_BODY_ROLL, Math.min(MAX_BODY_ROLL, bodyRollRef.current));
    carGroupRef.current.rotateZ(bodyRollRef.current);

    // ── 7. Cinematic camera ──────────────────────────────────────────────────
    // Look-ahead point on track
    const tAhead = ((t + CAM_LOOKAHEAD_T) % 1);
    curve.getPoint(tAhead, tmpLookAhead);

    // Camera position: behind + above + follow lateral slightly
    const camBack = tangent.clone().negate().multiplyScalar(CAM_BACK);
    tmpCamPos.copy(point).add(camBack);
    tmpCamPos.y += CAM_HEIGHT;
    tmpCamPos.addScaledVector(tmpNorm, latPosRef.current * 0.28);

    state.camera.position.lerp(tmpCamPos, Math.min(1, CAM_LAG * 60 * dt));

    // Look toward blend of car pos and ahead point
    tmpCamTgt.lerpVectors(tmpPos, tmpLookAhead, 0.55);
    tmpCamTgt.y += 1.8;
    state.camera.lookAt(tmpCamTgt);

    // Dynamic FOV
    const speedRatioFov = Math.min(Math.abs(effectiveSpeed) / MAX_SPEED, 1);
    const targetFov = isBoostActive
      ? FOV_BASE + FOV_SPEED_ADD + FOV_BOOST_ADD
      : FOV_BASE + speedRatioFov * FOV_SPEED_ADD;
    fovRef.current += (targetFov - fovRef.current) * Math.min(1, FOV_LERP * dt);
    (state.camera as THREE.PerspectiveCamera).fov = fovRef.current;
    (state.camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    // ── 8. HUD ───────────────────────────────────────────────────────────────
    onSpeedChange(Math.abs(effectiveSpeed) * 3.6);
  });

  const neonColor = track.neonColor;
  const neonThree = new THREE.Color(neonColor);
  const redThree = new THREE.Color("#ff2244");

  return (
    <group ref={carGroupRef}>
      {/* Main body — low, wide, aggressive */}
      <mesh castShadow>
        <boxGeometry args={[2.1, 0.48, 4.2]} />
        <meshStandardMaterial
          color="#080810"
          roughness={0.15}
          metalness={0.95}
          emissive={neonThree}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Side winglets */}
      {([-1.15, 1.15] as number[]).map((x) => (
        <mesh key={x} position={[x, -0.08, -0.4]} castShadow>
          <boxGeometry args={[0.22, 0.12, 1.8]} />
          <meshStandardMaterial color="#111118" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}

      {/* Cockpit canopy */}
      <mesh position={[0, 0.42, -0.4]} castShadow>
        <boxGeometry args={[1.3, 0.38, 1.8]} />
        <meshStandardMaterial
          color="#04040c"
          roughness={0.05}
          metalness={0.98}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Neon side strips */}
      {([-1.06, 1.06] as number[]).map((x) => (
        <mesh key={x} position={[x, 0.02, 0]}>
          <boxGeometry args={[0.055, 0.14, 4.0]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonThree}
            emissiveIntensity={4}
          />
        </mesh>
      ))}

      {/* Front splitter */}
      <mesh position={[0, -0.25, 2.15]}>
        <boxGeometry args={[2.0, 0.08, 0.18]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Front headlights */}
      {([-0.62, 0.62] as number[]).map((x) => (
        <mesh key={x} position={[x, 0.02, 2.12]}>
          <boxGeometry args={[0.5, 0.12, 0.08]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonThree}
            emissiveIntensity={5}
          />
        </mesh>
      ))}

      {/* Rear diffuser */}
      <mesh position={[0, -0.22, -2.12]}>
        <boxGeometry args={[1.85, 0.14, 0.12]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Rear brake lights */}
      <mesh position={[0, 0.06, -2.12]}>
        <boxGeometry args={[1.7, 0.16, 0.07]} />
        <meshStandardMaterial
          color="#ff2244"
          emissive={redThree}
          emissiveIntensity={isBoostActive ? 1.5 : 2.8}
        />
      </mesh>

      {/* Hover pods — 4 corners */}
      {([-0.72, 0.72] as number[]).flatMap((x) =>
        ([-1.55, 1.55] as number[]).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.32, z]}>
            <cylinderGeometry args={[0.26, 0.20, 0.26, 10]} />
            <meshStandardMaterial
              color="#181818"
              emissive={neonThree}
              emissiveIntensity={isBoostActive ? 2.5 : 1.4}
            />
          </mesh>
        ))
      )}

      {/* Rear spoiler */}
      <mesh position={[0, 0.55, -1.85]}>
        <boxGeometry args={[2.1, 0.09, 0.45]} />
        <meshStandardMaterial color="#0c0c14" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[-1.05, 0.35, -1.85]}>
        <boxGeometry args={[0.07, 0.45, 0.4]} />
        <meshStandardMaterial color="#0c0c14" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[1.05, 0.35, -1.85]}>
        <boxGeometry args={[0.07, 0.45, 0.4]} />
        <meshStandardMaterial color="#0c0c14" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Boost exhaust glow */}
      {isBoostActive && (
        <mesh position={[0, -0.08, -2.3]}>
          <coneGeometry args={[0.35, 1.2, 8]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonThree}
            emissiveIntensity={6}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}

      {/* Lights */}
      <pointLight position={[0, 0.6, 2.2]} color={neonColor} intensity={10} distance={22} />
      <pointLight position={[0, -0.28, 0]} color={neonColor} intensity={4} distance={10} />
      {isBoostActive && (
        <pointLight position={[0, 0, -2.5]} color={neonColor} intensity={14} distance={18} />
      )}
    </group>
  );
}
