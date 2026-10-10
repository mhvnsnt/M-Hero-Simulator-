/**
 * customizer/morphs.ts — procedural body/face morphs via bone scaling.
 *
 * The cast GLBs ship ZERO morph targets (verified on JUDAS_classic.glb and
 * the 45-model survey), so morphs are done procedurally: each dial scales a
 * named set of bones. Bone names vary per rig (Judas: J_Hips/H_Upperarm_L…,
 * STICKUP: mixamorig:Hips/mixamorig:LeftArm…), so dials map to
 * case-insensitive name PATTERNS instead of exact names.
 *
 * Base scales are snapshotted once per model root (userData) and every apply
 * resets to base first — dials are idempotent and never stack.
 */

import * as THREE from "three";
import type { MorphKey, MorphValues } from "./types";

const BASE_KEY = "__customizerMorphBase";

/** One dial -> the bones it drives and how 0..1 maps to scale. */
interface MorphDef {
  key: MorphKey;
  label: string;
  hint: string;
  /** Bone-name patterns (first match per pattern wins). */
  bones: { pattern: RegExp; axes: ("x" | "y" | "z")[] }[];
  /** Scale at value 0 and value 1 (linear). */
  at0: number;
  at1: number;
}

export const MORPH_DEFS: MorphDef[] = [
  {
    key: "muscle",
    label: "Muscle",
    hint: "Arm, chest and thigh girth.",
    bones: [
      { pattern: /upperarm/i, axes: ["x", "z"] },
      { pattern: /forearm/i, axes: ["x", "z"] },
      { pattern: /upleg|thigh/i, axes: ["x", "z"] },
      { pattern: /spine2|chest/i, axes: ["x", "z"] },
      { pattern: /shoulder/i, axes: ["x", "z"] },
    ],
    at0: 0.88,
    at1: 1.14,
  },
  {
    key: "height",
    label: "Height",
    hint: "Leg length. The preview re-grounds the feet after scaling.",
    bones: [
      { pattern: /upleg|thigh/i, axes: ["y"] },
      { pattern: /(?<!up)leg(?!_)|shin|calf/i, axes: ["y"] },
    ],
    at0: 0.92,
    at1: 1.1,
  },
  {
    key: "build",
    label: "Build",
    hint: "Hip and shoulder width.",
    bones: [
      { pattern: /hips|pelvis/i, axes: ["x", "z"] },
      { pattern: /spine1/i, axes: ["x", "z"] },
      { pattern: /spine(?!1|2)|waist/i, axes: ["x", "z"] },
    ],
    at0: 0.9,
    at1: 1.12,
  },
  {
    key: "jaw",
    label: "Jaw",
    hint: "Jaw width / face fullness.",
    bones: [{ pattern: /jaw/i, axes: ["x", "z"] }],
    at0: 0.85,
    at1: 1.18,
  },
];

function snapshotBase(root: THREE.Object3D): Map<THREE.Object3D, THREE.Vector3> {
  let base = (root.userData as Record<string, unknown>)[BASE_KEY] as
    | Map<THREE.Object3D, THREE.Vector3>
    | undefined;
  if (!base) {
    base = new Map();
    let hasBones = false;
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) hasBones = true;
    });
    root.traverse((o) => {
      const bone = o as THREE.Bone;
      // M-Hero: procedural fighters have no bones — snapshot named meshes instead.
      if (bone.isBone || (!hasBones && (o as THREE.Mesh).isMesh && o.name)) {
        base!.set(o, o.scale.clone());
      }
    });
    (root.userData as Record<string, unknown>)[BASE_KEY] = base;
  }
  return base;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Reset every morphed bone to its authored scale. */
export function resetMorphs(root: THREE.Object3D): void {
  const base = (root.userData as Record<string, unknown>)[BASE_KEY] as
    | Map<THREE.Bone, THREE.Vector3>
    | undefined;
  if (!base) return;
  for (const [bone, scale] of base) bone.scale.copy(scale);
}

/**
 * Apply morph values to the model. Resets to base first (idempotent), scales
 * matched bones, then re-grounds the model so feet sit at y=0 (height dial).
 */
export function applyMorphs(root: THREE.Object3D, values: MorphValues): void {
  const base = snapshotBase(root);
  resetMorphs(root);

  for (const def of MORPH_DEFS) {
    const v = values[def.key];
    if (v === 0.5) continue; // authored shape — skip
    const scale = lerp(def.at0, def.at1, v);
    const matched = new Set<THREE.Object3D>();
    for (const { pattern, axes } of def.bones) {
      for (const bone of base.keys()) {
        if (matched.has(bone)) continue;
        if (!pattern.test(bone.name)) continue;
        matched.add(bone);
        const b = base.get(bone)!;
        if (axes.includes("x")) bone.scale.x = b.x * scale;
        if (axes.includes("y")) bone.scale.y = b.y * scale;
        if (axes.includes("z")) bone.scale.z = b.z * scale;
      }
    }
  }
  reground(root);
}

/** Shift the root so the lowest skinned point sits at y=0 (after leg scaling). */
function reground(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (!isFinite(box.min.y)) return;
  root.position.y -= box.min.y;
}

/** Which morph dials actually found bones (or named meshes, M-Hero) on this model. */
export function supportedMorphs(root: THREE.Object3D): MorphKey[] {
  const bones: string[] = [];
  let hasBones = false;
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      hasBones = true;
      bones.push(o.name);
    }
  });
  // M-Hero: procedural fighters — match morph patterns against mesh names.
  if (!hasBones) {
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name) bones.push(o.name);
    });
  }
  return MORPH_DEFS.filter((def) =>
    def.bones.some(({ pattern }) => bones.some((n) => pattern.test(n))),
  ).map((d) => d.key);
}
