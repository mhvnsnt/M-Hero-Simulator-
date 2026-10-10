/**
 * M-Hero adapter for the character-customization suite.
 *
 * Bridges the suite (built for rigged GLB fighters) to M-Hero's procedural
 * fighters: 20 named capsule meshes in `fighter.bones` (no skeleton, no
 * THREE.Bone). The suite's attach/morph finders fall back to named meshes
 * when a model has no bones (see accessories.ts / morphs.ts).
 *
 * Capabilities are honest per model:
 * - morphs: yes (mesh-name patterns)
 * - accessories: yes (mesh attach points)
 * - eye colors: no (no dedicated iris material on procedural heads or robot)
 * - face paint: no (no face UV profile for procedural/robot heads)
 */
import * as THREE from "three";
import type { CustomBuild, AccessorySlotId } from "./customizer/types";
import { applyMorphs, supportedMorphs, resetMorphs } from "./customizer/morphs";
import {
  attachAccessory,
  detachAllAccessories,
  loadAccessoryManifests,
  manifestsForSlot,
} from "./customizer/accessories";
import type { AccessoryManifest } from "./customizer/types";
import { findIrisMaterials } from "./customizer/eye-colors";

/** Minimal structural view of an M-Hero fighter needed by the customizer. */
export interface FighterLike {
  group: THREE.Group;
  bones: Map<string, THREE.Mesh>;
  superheroConfig?: { name?: string };
}

export interface FighterCapabilities {
  morphs: boolean;
  accessories: boolean;
  eyeColors: boolean;
  facePaint: boolean;
  notes: string[];
}

/** The THREE root the suite customizes.
 * M-Hero's fighter meshes live flat in the scene (not under f.group), so we
 * provide a persistent Group per fighter whose userData.customMeshes lists
 * the body-part meshes. The suite's finders check this first. */
const rootCache = new WeakMap<FighterLike, THREE.Group>();
export function fighterRoot(f: FighterLike): THREE.Group {
  let root = rootCache.get(f);
  if (!root) {
    root = new THREE.Group();
    root.name = `customizer-root`;
    rootCache.set(f, root);
  }
  (root.userData as Record<string, unknown>).customMeshes = fighterMeshes(f);
  (root.userData as Record<string, unknown>).fighterId =
    f.superheroConfig?.name ?? "fighter";
  return root;
}

/** Meshes for building a preview clone. */
export function fighterMeshes(f: FighterLike): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const [name, mesh] of f.bones) {
    // The game keys meshes by name but never sets mesh.name — do it here
    // so the suite's name-pattern matching works.
    if (!mesh.name) mesh.name = name;
    out.push(mesh);
  }
  return out;
}

export function getFighterCapabilities(f: FighterLike): FighterCapabilities {
  const notes: string[] = [];
  const root = fighterRoot(f);
  const morphs = supportedMorphs(root).length > 0;
  const iris = findIrisMaterials(root);
  const eyeColors = iris.length > 0;
  if (!eyeColors) {
    notes.push(
      "Eye colors need a dedicated iris material — this fighter's eyes are baked into the head mesh."
    );
  }
  // No face UV profile exists for M-Hero's procedural/robot heads yet.
  notes.push("Face paint needs a face UV profile for this head — not authored yet.");
  return { morphs, accessories: true, eyeColors, facePaint: false, notes };
}

/** Apply a full CustomBuild to a live fighter. */
export async function applyBuildToFighter(
  f: FighterLike,
  build: CustomBuild,
  manifests?: AccessoryManifest[]
): Promise<void> {
  const root = fighterRoot(f);
  // Morphs (idempotent — resets to base first).
  resetMorphs(root);
  applyMorphs(root, build.morphs);
  // Accessories: clear all, then attach per slot.
  detachAllAccessories(root);
  const all = manifests ?? (await loadAccessoryManifests());
  const slots: AccessorySlotId[] = [
    "hair",
    "facialHair",
    "mask",
    "hood",
    "chain",
    "gloves",
    "wristbands",
    "shoes",
  ];
  for (const slot of slots) {
    const id = build.accessories[slot];
    if (!id) continue;
    const manifest = all.find((m) => m.id === id && m.slot === slot);
    if (manifest) {
      await attachAccessory(root, manifest).catch(() => null);
    }
  }
}

/** Manifests grouped by slot (for the UI). */
export async function manifestsBySlot(): Promise<Record<AccessorySlotId, AccessoryManifest[]>> {
  const all = await loadAccessoryManifests();
  const slots: AccessorySlotId[] = [
    "hair",
    "facialHair",
    "mask",
    "hood",
    "chain",
    "gloves",
    "wristbands",
    "shoes",
  ];
  const out = {} as Record<AccessorySlotId, AccessoryManifest[]>;
  for (const slot of slots) out[slot] = manifestsForSlot(all, slot);
  return out;
}
