import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TrackConfig, TRACK_WIDTH, buildCurve } from "./trackData";

interface TrackProps {
  track: TrackConfig;
  groundColor: string;
}

export default function Track({ track, groundColor }: TrackProps) {
  const curve = useMemo(() => buildCurve(track), [track]);

  const trackGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const segments = 300;
    const halfWidth = TRACK_WIDTH / 2;
    const up = new THREE.Vector3(0, 1, 0);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3()
        .crossVectors(up, tangent)
        .normalize();

      const left = point.clone().sub(normal.clone().multiplyScalar(halfWidth));
      const right = point.clone().add(normal.clone().multiplyScalar(halfWidth));

      positions.push(left.x, left.y - 0.05, left.z);
      positions.push(right.x, right.y - 0.05, right.z);
      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, t * 20, 1, t * 20);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }, [curve]);

  const barrierPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 200;
    const halfWidth = TRACK_WIDTH / 2 + 0.5;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3()
        .crossVectors(up, tangent)
        .normalize();

      pts.push(
        point.clone().sub(normal.clone().multiplyScalar(halfWidth)),
        point.clone().add(normal.clone().multiplyScalar(halfWidth))
      );
    }
    return pts;
  }, [curve]);

  const leftBarrierPts = useMemo(
    () => barrierPoints.filter((_, i) => i % 2 === 0),
    [barrierPoints]
  );
  const rightBarrierPts = useMemo(
    () => barrierPoints.filter((_, i) => i % 2 === 1),
    [barrierPoints]
  );

  const neonColor = new THREE.Color(track.neonColor);

  const totalLen = curve.getLength();
  const groundSize = Math.max(totalLen * 1.2, 250);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, -0.5, 45]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>

      {/* Track surface */}
      <mesh geometry={trackGeometry} receiveShadow>
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Track center line (neon stripe) */}
      <mesh geometry={trackGeometry}>
        <meshStandardMaterial
          color={track.neonColor}
          emissive={neonColor}
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Left barrier */}
      {leftBarrierPts.length > 1 && (
        <BarrierLine points={leftBarrierPts} color={track.neonColor} />
      )}

      {/* Right barrier */}
      {rightBarrierPts.length > 1 && (
        <BarrierLine points={rightBarrierPts} color={track.neonColor} />
      )}

      {/* Start/finish line */}
      <StartLine curve={curve} color={track.neonColor} />

      {/* Ambient city/environment props */}
      <TrackEnvironment track={track} curve={curve} />
    </group>
  );
}

function BarrierLine({
  points,
  color,
}: {
  points: THREE.Vector3[];
  color: string;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (const pt of points) {
      positions.push(pt.x, pt.y + 0.8, pt.z);
    }
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }, [points]);

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }))} />
  );
}

function StartLine({
  curve,
  color,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
}) {
  const point = curve.getPoint(0);
  const tangent = curve.getTangent(0).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3()
    .crossVectors(up, tangent)
    .normalize();

  const angle = Math.atan2(normal.x, normal.z);

  return (
    <mesh
      position={[point.x, point.y + 0.01, point.z]}
      rotation={[-Math.PI / 2, 0, angle]}
    >
      <planeGeometry args={[TRACK_WIDTH, 1.2]} />
      <meshStandardMaterial
        color={color}
        emissive={new THREE.Color(color)}
        emissiveIntensity={1.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function TrackEnvironment({
  track,
  curve,
}: {
  track: TrackConfig;
  curve: THREE.CatmullRomCurve3;
}) {
  const props = useMemo(() => {
    const items: { pos: THREE.Vector3; scale: number; side: number }[] = [];
    const count = 24;
    const halfWidth = TRACK_WIDTH / 2;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const normal = new THREE.Vector3()
        .crossVectors(up, tangent)
        .normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const offset = halfWidth + 8 + (i % 3) * 4;
      const pos = point
        .clone()
        .add(normal.clone().multiplyScalar(side * offset));
      pos.y = 0;
      items.push({ pos, scale: 3 + (i % 4), side });
    }
    return items;
  }, [curve]);

  const neonColor = new THREE.Color(track.neonColor);

  if (track.id === "neon-city") {
    return (
      <group>
        {props.map((p, i) => (
          <group key={i} position={[p.pos.x, p.pos.y, p.pos.z]}>
            {/* Building */}
            <mesh position={[0, p.scale * 3, 0]} castShadow>
              <boxGeometry args={[p.scale * 1.5, p.scale * 6, p.scale * 1.5]} />
              <meshStandardMaterial
                color="#0d1117"
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>
            {/* Neon top */}
            <pointLight
              position={[0, p.scale * 6 + 1, 0]}
              color={track.neonColor}
              intensity={2}
              distance={20}
            />
          </group>
        ))}
      </group>
    );
  }

  return (
    <group>
      {props.map((p, i) => (
        <group key={i} position={[p.pos.x, p.pos.y, p.pos.z]}>
          {/* Crystal shard */}
          <mesh position={[0, p.scale * 1.5, 0]} castShadow>
            <coneGeometry args={[p.scale * 0.6, p.scale * 3, 6]} />
            <meshStandardMaterial
              color="#1a0a2e"
              emissive={neonColor}
              emissiveIntensity={0.3}
              roughness={0.1}
              metalness={0.5}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
