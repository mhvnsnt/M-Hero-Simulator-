/**
 * customizer/facepaint-adapter.ts — bridge to the paint lane's module.
 *
 * The paint lane owns src/game3d/customization/facepaint/index.ts; per the
 * docs/customization/face-paint.md integration contract the customizer
 * imports ONLY from that surface (getPickerData, getPreset,
 * clonePresetLayers, validateLayers, serializeLayers/parseLayers,
 * FacePaintDecal, FACE_PATTERNS, getProfile).
 *
 * The build stores the paint selection as one string: a canon preset id
 * ("cipher-grin") or serialized FacePaintLayer[] (the paint lane's
 * serializeLayers). The adapter resolves preset ids via getPreset() and
 * falls back to parseLayers() — so custom paint round-trips through saves.
 *
 * Skin-tone lock: paint lives on the FacePaintDecal overlay mesh only.
 * The base mesh / material / texture are never written.
 */

import * as THREE from "three";
import {
  getPickerData,
  getPreset,
  clonePresetLayers,
  validateLayers,
  serializeLayers,
  parseLayers,
  FACE_PATTERNS,
  FacePaintDecal,
  getProfile,
} from "../facepaint/index";
import type {
  FacePaintLayer,
  FacePaintPickerData,
  FaceDecal,
} from "../facepaint/index";

export type { FacePaintLayer, FacePaintPickerData };

const DECAL_KEY = "__customizerFacePaintDecal";

type DecalEntry = { decal: FaceDecal; fighterId: string };

function decalEntry(root: THREE.Object3D): DecalEntry | null {
  return ((root.userData as Record<string, unknown>)[DECAL_KEY] as DecalEntry) ?? null;
}

/** True when the paint lane has a verified face profile for this fighter. */
export function facePaintAvailable(fighterId: string): boolean {
  return !!getProfile(fighterId);
}

/** Everything the paint picker menu renders from (regions, patterns, colors, presets). */
export function facePaintPickerData(): FacePaintPickerData {
  return getPickerData();
}

/** Canon preset layer stack, cloned (never edit the lane's preset in place). */
export function facePaintPresetLayers(presetId: string): FacePaintLayer[] {
  return clonePresetLayers(getPreset(presetId));
}

/** Serialize a custom layer stack for build.facePaint. */
export function serializeFacePaintLayers(layers: FacePaintLayer[]): string {
  return serializeLayers(layers);
}

/** Validate a layer stack before applying. Returns error strings (empty = ok). */
export function validateFacePaintLayers(layers: FacePaintLayer[]): string[] {
  return validateLayers(layers);
}

/** First skinned body mesh under the root — the decal binds to the character's skeleton. */
function findBodyMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.SkinnedMesh).isSkinnedMesh) found = o as THREE.SkinnedMesh;
  });
  return found;
}

/**
 * Build (once per fighter root) the FacePaintDecal for this fighter.
 * Build order in preview.loadFighter: the decal is created before the idle
 * animation starts (bind-pose preferred per the paint lane's contract —
 * mesh.bind uses the skeleton's own bindMatrix, so an already-playing idle
 * clip only moves the decal WITH the head, never offsets it).
 */
async function ensureDecal(root: THREE.Object3D, fighterId: string): Promise<FaceDecal | null> {
  const profile = getProfile(fighterId);
  if (!profile) return null;
  const existing = decalEntry(root);
  if (existing && existing.fighterId === fighterId) return existing.decal;
  if (existing) existing.decal.dispose();
  const mesh = findBodyMesh(root);
  if (!mesh) return null;
  const decal = FacePaintDecal.build(mesh, profile);
  // Integration note (LANE-UI, 2026-10-09): the paint lane ships the decal
  // material with depthWrite:false. Verified in headless-Chromium QC
  // (SwiftShader): a transparent + depthWrite:false skinned decal does NOT
  // composite — the paint is invisible. Forcing depthWrite=true here.
  // Additionally, the FIRST paint in a page session needs a material
  // re-touch (transparent/depthWrite re-assert + needsUpdate) AFTER
  // applyBuild has returned and the preview has rendered with the decal
  // visible; doing it during applyBuild poisons the material (verified).
  // See retouchFacePaint() — the UI/driver must call it ~1s after apply.
  // The erase blend still punches alpha (reveals skin); the 2mm surface
  // offset + polygonOffset prevent z-fighting. Paint lane: please review
  // (may belong in decal.ts; may be SwiftShader-specific).
  decal.material.depthWrite = true;
  (root.userData as Record<string, unknown>)[DECAL_KEY] = { decal, fighterId } as DecalEntry;
  return decal;
}

/** Re-assert the decal material state after the painted texture uploads.
 * Must be called AFTER applyBuild has returned and the preview has rendered
 * (see ensureDecal note) — calling it during applyBuild poisons the material.
 * The customizer UI / QC driver should call this ~1s after applying paint. */
export function retouchFacePaint(root: THREE.Object3D): void {
  const entry = decalEntry(root);
  if (!entry) return;
  entry.decal.material.transparent = true;
  entry.decal.material.depthWrite = true;
  entry.decal.material.needsUpdate = true;
}

/** Resolve a build.facePaint spec to a validated layer stack. */
export function resolveFacePaintLayers(spec: string): { layers: FacePaintLayer[]; errors: string[] } {
  try {
    const preset = getPreset(spec);
    return { layers: clonePresetLayers(preset), errors: [] };
  } catch {
    // Not a preset id — treat as serialized custom layers.
  }
  try {
    const layers = parseLayers(spec);
    return { layers, errors: [] };
  } catch (e) {
    return { layers: [], errors: [e instanceof Error ? e.message : String(e)] };
  }
}

/**
 * Apply a paint spec (preset id or serialized layers) to the model root.
 * Returns validation/build errors (empty = painted). Never throws.
 */
export async function applyFacePaintSpec(
  root: THREE.Object3D,
  fighterId: string,
  spec: string,
): Promise<string[]> {
  const { layers, errors } = resolveFacePaintLayers(spec);
  if (errors.length > 0) return errors;
  const paintErrors = validateLayers(layers);
  if (paintErrors.length > 0) return paintErrors;
  const decal = await ensureDecal(root, fighterId);
  if (!decal) return ["Face paint isn't supported for this fighter yet."];
  await decal.painter.paint(layers, FACE_PATTERNS);
  decal.texture.needsUpdate = true;
  decal.setVisible(true);
  return [];
}

/** Hide paint without repainting (skin-tone lock: base untouched). */
export function clearFacePaint(root: THREE.Object3D): void {
  decalEntry(root)?.decal.setVisible(false);
}

/** Dispose the decal when the model root is discarded (fighter switch). */
export function disposeFacePaint(root: THREE.Object3D): void {
  const entry = decalEntry(root);
  if (entry) {
    entry.decal.dispose();
    delete (root.userData as Record<string, unknown>)[DECAL_KEY];
  }
}
