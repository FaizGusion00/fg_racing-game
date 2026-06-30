import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TrackConfig, TRACK_WIDTH, buildCurve } from "./trackData";

const BOOST_PAD_TS = [0.12, 0.28, 0.45, 0.62, 0.78];
const DETECT_THRESHOLD = 0.025;
const PAD_COOLDOWN_MS = 5000;

interface BoostPadProps {
  track: TrackConfig;
  carTRef: React.RefObject<number>;
  onBoost: () => void;
  active: boolean;
}

export default function BoostPads({
  track,
  carTRef,
  onBoost,
  active,
}: BoostPadProps) {
  const curve = useMemo(() => buildCurve(track), [track]);
  const cooldowns = useRef<Map<number, number>>(new Map());
  const time = useRef(0);

  const padPositions = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    return BOOST_PAD_TS.map((t) => {
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      return { pos: new THREE.Vector3(point.x, point.y + 0.08, point.z), angle, t };
    });
  }, [curve]);

  useFrame((_, delta) => {
    if (!active) return;
    time.current += delta;

    const carT = carTRef.current ?? 0;
    const now = Date.now();

    BOOST_PAD_TS.forEach((padT, idx) => {
      const lastActivated = cooldowns.current.get(idx) ?? 0;
      if (now - lastActivated < PAD_COOLDOWN_MS) return;

      let dist = Math.abs(carT - padT);
      if (dist > 0.5) dist = 1 - dist;

      if (dist < DETECT_THRESHOLD) {
        cooldowns.current.set(idx, now);
        onBoost();
      }
    });
  });

  return (
    <group>
      {padPositions.map((pad, i) => (
        <BoostPadMesh key={i} position={pad.pos} angle={pad.angle} padT={pad.t} cooldowns={cooldowns} idx={i} />
      ))}
    </group>
  );
}

function BoostPadMesh({
  position,
  angle,
  padT,
  cooldowns,
  idx,
}: {
  position: THREE.Vector3;
  angle: number;
  padT: number;
  cooldowns: React.RefObject<Map<number, number>>;
  idx: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (!meshRef.current) return;

    const now = Date.now();
    const lastActivated = cooldowns.current?.get(idx) ?? 0;
    const onCooldown = now - lastActivated < 5000;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (onCooldown) {
      mat.emissiveIntensity = 0.1;
      mat.color.setHex(0x333300);
    } else {
      mat.emissiveIntensity = 0.8 + Math.sin(time.current * 4) * 0.4;
      mat.color.setHex(0x886600);
    }
  });

  return (
    <group position={position} rotation={[0, angle, 0]}>
      <mesh ref={meshRef} receiveShadow>
        <boxGeometry args={[TRACK_WIDTH * 0.5, 0.12, 3]} />
        <meshStandardMaterial
          color="#886600"
          emissive={new THREE.Color("#ffaa00")}
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Arrow chevrons on pad */}
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[TRACK_WIDTH * 0.35, 0.05, 0.5]} />
        <meshStandardMaterial
          color="#ffdd00"
          emissive={new THREE.Color("#ffdd00")}
          emissiveIntensity={1.5}
        />
      </mesh>
      <pointLight
        position={[0, 1.5, 0]}
        color="#ffaa00"
        intensity={3}
        distance={12}
      />
    </group>
  );
}
