/**
 * customizer/accessories.ts — accessory slots driven by lane manifests.
 *
 * The modeling lanes ship public/models/<category>/manifest.json files
 * describing each accessory and how it attaches. This module:
 *  - fetches and merges those manifests at runtime (no code change per lane),
 *  - normalizes the two lane-authored shapes into one AccessoryManifest,
 *  - applies the per-character head-fit transforms measured in
 *    public/models/{masks,hoods,hair}/FIT_NOTES.md (ASTRID-authored assets
 *    on Tripo-rigged heads need scaling + the ECHO nudge),
 *  - loads the accessory GLB,
 *  - hangs it from a named bone (exact name, then case-insensitive pattern
 *    fallback, then a slot-default bone heuristic),
 *  - keeps a per-slot registry on the model root so swaps are clean.
 *
 * Manifest shapes (see docs/customization/customizer.md):
 *  A) chains (models/accessories): { accessories: [ { id, label, slot, file,
 *     attach: { bone, position, rotation, scale } } ] }
 *  B) merged 2026-10-09 lanes (masks/hoods/hair, gloves/wristbands/footwear):
 *     a top-level array of { asset, file ("public/models/…" prefixed),
 *     attachBone, offset, scale, canonNotes, category? } — no id / label /
 *     slot / rotation. The loader derives id=asset, a humanized label, the
 *     slot from the manifest's folder, rotation=[0,0,0], and a canon flag
 *     from canonNotes.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetUrl } from "../../asset-base";
import type { AccessoryManifest, AccessorySlotId } from "./types";

/**
 * Manifest locations the customizer scans, with the slot each folder feeds.
 * footwear → the "shoes" slot (kept name for save compatibility).
 * Lanes add rows here as they merge — the code below is format-agnostic.
 */
const MANIFEST_SOURCES: { url: string; slot: AccessorySlotId }[] = [
  { url: "models/accessories/manifest.json", slot: "chain" },
  { url: "models/hair/manifest.json", slot: "hair" },
  { url: "models/masks/manifest.json", slot: "mask" },
  { url: "models/hoods/manifest.json", slot: "hood" },
  { url: "models/gloves/manifest.json", slot: "gloves" },
  { url: "models/wristbands/manifest.json", slot: "wristbands" },
  { url: "models/footwear/manifest.json", slot: "shoes" },
];

/** Slot -> bone-name patterns tried when a manifest names no exact bone. */
const SLOT_BONE_FALLBACK: Record<AccessorySlotId, RegExp[]> = {
  hair: [/head/i],
  facialHair: [/head/i, /jaw/i],
  mask: [/head/i],
  hood: [/head/i, /neck/i],
  chain: [/neck/i, /spine2/i, /chest/i],
  gloves: [/hand/i],
  wristbands: [/forearm/i, /wrist/i, /hand/i],
  shoes: [/foot/i, /toe/i],
};

const REGISTRY_KEY = "__customizerAccessories";

/**
 * Per-character fit for head-slot accessories (hair / facialHair / mask /
 * hood). Assets are authored in ASTRID space
 * (public/models/{masks,hoods,hair}/FIT_NOTES.md); Tripo-rigged heads
 * (HOLLOW / ECHO / STATIC) need measured per-character transforms:
 *   scale  = head-bone height ratio vs ASTRID (1.5232m):
 *            HOLLOW 0.4458, ECHO 0.4494, STATIC 0.4494
 *   echo nudge: ECHO's nose sits (y=-0.176, z=-0.026) rel. her head bone vs
 *            ASTRID's (y=-0.105, z=+0.076). Uniform 0.4494 scale maps the
 *            authored nose to (y=-0.0472, z=+0.0342) rel. ECHO's head bone,
 *            so the accessory needs a nudge of
 *            dy = -0.176 - (-0.0472) = -0.1288,
 *            dz = -0.026 - (+0.0342) = -0.0602   (fighter-root units).
 *   rotFix: Tripo heads share a rotated head-bone rest orientation vs
 *            ASTRID's axis-aligned one; full-head shells transfer acceptably,
 *            hair fringes show it visibly. The per-character fix (degrees
 *            XYZ, applied like the chain pendant rotation) is the tuning
 *            knob — defaults to zero until measured; QC the fringe assets.
 * Unknown fighters (and non-head slots) get identity: scale 1, no nudge.
 */
const HEAD_SLOTS = new Set<AccessorySlotId>(["hair", "facialHair", "mask", "hood"]);

const HEAD_FIT: Record<string, { scale: number; offset?: [number, number, number]; rotFix?: [number, number, number] }> = {
  hollow: { scale: 0.4458 },
  echo: { scale: 0.4494, offset: [0, -0.1288, -0.0602] },
  static: { scale: 0.4494 },
};

function headFit(fighterId: string | undefined, slot: AccessorySlotId): {
  scale: number;
  offset: [number, number, number];
  rotFix: [number, number, number];
} {
  const none = { scale: 1, offset: [0, 0, 0] as [number, number, number], rotFix: [0, 0, 0] as [number, number, number] };
  if (!fighterId || !HEAD_SLOTS.has(slot)) return none;
  const f = HEAD_FIT[fighterId.toLowerCase()];
  if (!f) return none;
  return {
    scale: f.scale,
    offset: f.offset ?? [0, 0, 0],
    rotFix: f.rotFix ?? [0, 0, 0],
  };
}

/** Fighter id the preview stores on the model root (preview.loadFighter). */
function fighterOf(root: THREE.Object3D): string | undefined {
  return (root.userData as Record<string, unknown>).fighterId as string | undefined;
}

type Registry = Map<AccessorySlotId, { id: string; nodes: THREE.Object3D[] }>;

function registry(root: THREE.Object3D): Registry {
  let reg = (root.userData as Record<string, unknown>)[REGISTRY_KEY] as Registry | undefined;
  if (!reg) {
    reg = new Map();
    (root.userData as Record<string, unknown>)[REGISTRY_KEY] = reg;
  }
  return reg;
}

let manifestCache: AccessoryManifest[] | null = null;

/** "mask_hollow_superdragon" -> "Hollow Superdragon". */
function humanizeAsset(asset: string): string {
  return asset
    .replace(/^((mask|hair|hood|chain|glove|shoe|boot|sneaker|wrap|sweatband|pad)[-_])/, "")
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

type LaneEntry = {
  id?: string;
  label?: string;
  slot?: AccessorySlotId;
  asset?: string;
  file?: string;
  attach?: {
    bone?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  };
  attachBone?: string;
  offset?: [number, number, number];
  scale?: number;
  canonNotes?: string;
};

/**
 * Normalize one lane-authored entry into the customizer's AccessoryManifest.
 * Shape A (chains) passes through; shape B (merged 2026-10-09 lanes) is
 * derived: id=asset, slot from the manifest folder, "public/" stripped from
 * file, rotation defaulted, canon flagged from canonNotes.
 */
function normalizeEntry(entry: LaneEntry, fallbackSlot: AccessorySlotId): AccessoryManifest | null {
  const file = (entry.file ?? "").replace(/^public\//, "");
  if (!file) return null;
  // Canon flag: "OWNER CANON …" / "CANON: …" mark canon; "no canon lock"
  // explicitly opts out (roster variants).
  const notes = entry.canonNotes ?? "";
  const canon = /\bcanon\b/i.test(notes) && !/no canon/i.test(notes);
  if (entry.id && entry.attach) {
    // Shape A — chains.
    return {
      id: entry.id,
      label: entry.label ?? entry.id,
      slot: entry.slot ?? fallbackSlot,
      file,
      canon: canon || undefined,
      canonNotes: entry.canonNotes,
      attach: {
        bone: entry.attach.bone ?? "Neck",
        position: entry.attach.position ?? [0, 0, 0],
        rotation: entry.attach.rotation ?? [0, 0, 0],
        scale: entry.attach.scale,
      },
    };
  }
  if (entry.asset) {
    // Shape B — masks/hoods/hair, gloves/wristbands/footwear.
    return {
      id: entry.asset,
      label: humanizeAsset(entry.asset),
      slot: fallbackSlot,
      file,
      canon: canon || undefined,
      canonNotes: entry.canonNotes,
      attach: {
        bone: entry.attachBone ?? "mixamorig:Head",
        position: entry.offset ?? [0, 0, 0],
        rotation: [0, 0, 0],
        scale: entry.scale ?? 1,
      },
    };
  }
  return null;
}

/** Load and merge every accessory manifest. Cached after first call. */
export async function loadAccessoryManifests(): Promise<AccessoryManifest[]> {
  if (manifestCache) return manifestCache;
  const out: AccessoryManifest[] = [];
  await Promise.all(
    MANIFEST_SOURCES.map(async ({ url, slot }) => {
      try {
        const res = await fetch(assetUrl(url));
        if (!res.ok) return;
        const json = (await res.json()) as
          | { accessories?: LaneEntry[] }
          | LaneEntry[];
        const entries = Array.isArray(json) ? json : (json.accessories ?? []);
        if (Array.isArray(json)) {
          // Shape B — group L/R pairs (gloves, wristbands, footwear share
          // one asset id across two files) into a single manifest.
          const groups = new Map<string, LaneEntry[]>();
          for (const e of entries) {
            const key = e.asset ?? e.id ?? "";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(e);
          }
          for (const [, group] of groups) {
            const m = normalizeEntry(group[0], slot);
            if (!m) continue;
            const extras = group
              .slice(1)
              .map((e) => (e.file ?? "").replace(/^public\//, ""))
              .filter(Boolean);
            if (extras.length > 0) m.pairFiles = extras;
            out.push(m);
          }
        } else {
          for (const e of entries) {
            const m = normalizeEntry(e, slot);
            if (m) out.push(m);
          }
        }
      } catch {
        // Manifest not merged yet (parallel lane) — skip silently.
      }
    }),
  );
  manifestCache = out;
  return out;
}

export function manifestsForSlot(
  manifests: AccessoryManifest[],
  slot: AccessorySlotId,
): AccessoryManifest[] {
  return manifests.filter((m) => m.slot === slot);
}

/** Find the best attach point for an accessory: exact name -> pattern -> slot fallback.
 * M-Hero adaptation: accepts THREE.Bone OR named meshes (procedural fighters
 * have no skeleton — their body parts are named meshes). If root.userData
 * carries customMeshes (M-Hero adapter), those are searched instead of
 * traversing. Returns THREE.Object3D; callers use .add() which works on both. */
function findBone(root: THREE.Object3D, want: string, slot: AccessorySlotId): THREE.Object3D | null {
  const custom = (root.userData as Record<string, unknown>).customMeshes as THREE.Object3D[] | undefined;
  const bones: THREE.Object3D[] = [];
  if (custom) {
    for (const o of custom) {
      if ((o as THREE.Bone).isBone) bones.push(o);
    }
    if (bones.length === 0) {
      for (const o of custom) {
        if ((o as THREE.Mesh).isMesh && o.name) bones.push(o);
      }
    }
  } else {
    root.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.push(o);
    });
    // Procedural-rig fallback: named meshes (e.g. M-Hero's 'head', 'lHand').
    // Only used when the model has no bones at all.
    if (bones.length === 0) {
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.name) bones.push(o);
      });
    }
  }
  const exact = bones.find((b) => b.name === want);
  if (exact) return exact;
  const wantRe = new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const fuzzy = bones.find((b) => wantRe.test(b.name));
  if (fuzzy) return fuzzy;
  for (const re of SLOT_BONE_FALLBACK[slot]) {
    const fb = bones.find((b) => re.test(b.name));
    if (fb) return fb;
  }
  return bones[0] ?? null;
}

/** Normalize a bone name for fuzzy matching: lowercase, strip the mixamo
 * prefixes (colon "mixamorig:", packed "mixamorig", stripped) and the
 * single-letter DCC prefixes (J_, H_, N_, F_), drop non-alphanumerics.
 * Mirrors the canonicalization in src/game3d/mediapipe-mocap.ts. */
function normBone(name: string): string {
  return name
    .replace(/^mixamorig:/, "")
    .replace(/^mixamorig/, "")
    .replace(/^[jhnf]_/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const sharedLoader = new GLTFLoader();

/**
 * Rebind an accessory's skinned meshes onto the fighter's bones by name
 * (exact, then normalized-fuzzy). Mirrors quaternius.attachPart. Returns the
 * rebound meshes — the caller must bind() them AFTER they are placed in the
 * scene graph, so the bind matrix matches their final world transform.
 */
function rebindAccessoryBones(
  root: THREE.Object3D,
  node: THREE.Object3D,
): THREE.SkinnedMesh[] {
  const bodyBones = new Map<string, THREE.Bone>();
  const fuzzy = new Map<string, THREE.Bone>();
  root.traverse((o) => {
    const bone = o as THREE.Bone;
    if (!bone.isBone) return;
    bodyBones.set(bone.name, bone);
    const n = normBone(bone.name);
    if (!fuzzy.has(n)) fuzzy.set(n, bone);
  });
  if (bodyBones.size === 0) return [];

  const rebound: THREE.SkinnedMesh[] = [];
  node.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const src = mesh.skeleton;
    const remapped: THREE.Bone[] = [];
    const inverses: THREE.Matrix4[] = [];
    for (let i = 0; i < src.bones.length; i++) {
      const name = src.bones[i].name;
      const target = bodyBones.get(name) ?? fuzzy.get(normBone(name));
      if (!target) return []; // incomplete bind — fall back to bone-hang
      remapped.push(target);
      inverses.push(src.boneInverses[i].clone());
    }
    mesh.skeleton = new THREE.Skeleton(remapped, inverses);
    rebound.push(mesh);
  });
  return rebound;
}

/**
 * Attach an accessory manifest to the model root. Replaces whatever was in
 * that slot before. Returns the first attached node, or null on failure.
 * pairFiles (limb-lane L/R pairs) attach as one selection.
 *
 * Strategy: accessories that ship their own rig (the chains are skinned to
 * Neck/Spine2; the masks/hair to Head/Neck/Spine2; gloves to Hand/ForeArm;
 * boots to Foot/ToeBase/Leg) are REBOUND onto the fighter's matching bones
 * so they move with the body. Non-skinned accessories fall back to hanging
 * from the manifest's attach bone with the authored offset/rotation.
 *
 * Head slots (hair/mask/hood) get the per-character fit transform
 * (HEAD_FIT): the measured scale + ECHO nudge + rest-pose rotation fix.
 */
export async function attachAccessory(
  root: THREE.Object3D,
  manifest: AccessoryManifest,
): Promise<THREE.Object3D | null> {
  detachAccessory(root, manifest.slot);
  const fit = headFit(fighterOf(root), manifest.slot);
  const nodes: THREE.Object3D[] = [];
  for (const file of [manifest.file, ...(manifest.pairFiles ?? [])]) {
    const node = await attachSingle(root, manifest, file, fit).catch(() => null);
    if (node) nodes.push(node);
  }
  if (nodes.length === 0) return null;
  registry(root).set(manifest.slot, { id: manifest.id, nodes });
  return nodes[0];
}

interface FitTransform {
  scale: number;
  offset: [number, number, number];
  rotFix: [number, number, number];
}

/** Attach one GLB file of a manifest (see attachAccessory for the strategy). */
async function attachSingle(
  root: THREE.Object3D,
  manifest: AccessoryManifest,
  file: string,
  fit: FitTransform,
): Promise<THREE.Object3D | null> {
  const gltf = await sharedLoader.loadAsync(assetUrl(file)).catch(() => null);
  if (!gltf) return null;
  const node = gltf.scene;
  node.traverse((o) => {
    o.frustumCulled = true;
  });

  const [frx, fry, frz] = fit.rotFix;

  const rebound = rebindAccessoryBones(root, node);
  if (rebound.length > 0) {
    // Skinned to the fighter now — collect the rebound meshes in a holder so
    // detachAccessory can remove them cleanly, then bind in final position.
    //
    // Exact rebind math: we want each vertex to land at
    //   Σ wᵢ · Wᵢ · S(s) · Iᵢ · v
    // (the accessory scaled by s about each target bone — s folds the
    // manifest DCC scale and the per-character FIT_NOTES scale together).
    // three.js renders Σ wᵢ · Wᵢ · I'ᵢ · B · v with B = bindMatrix, so with
    // the geometry and the accessory-local mesh transforms left UNTOUCHED:
    //   I'ᵢ = S(s) · Iᵢ · B⁻¹
    // The holder's rigid rotation (chain pendant tuning knob +
    // per-character Tripo rest-pose fix) and position (ECHO nudge) ride
    // inside B = mesh.matrixWorld at bind time — no separate compensation.
    // (Scaling the holder or the geometry instead would break the skinning
    // math: bind matrix vs bone matrices.)
    const s = (manifest.attach.scale ?? 1) * fit.scale;
    const holder = new THREE.Group();
    holder.name = `accessory:${manifest.id}`;
    const [rx, ry, rz] = manifest.attach.rotation;
    holder.rotation.set(
      ((rx + frx) * Math.PI) / 180,
      ((ry + fry) * Math.PI) / 180,
      ((rz + frz) * Math.PI) / 180,
    );
    holder.position.set(fit.offset[0], fit.offset[1], fit.offset[2]);
    for (const mesh of rebound) holder.add(mesh);
    root.add(holder);
    root.updateMatrixWorld(true);
    const S = new THREE.Matrix4().makeScale(s, s, s);
    for (const mesh of rebound) {
      const Binv = mesh.matrixWorld.clone().invert();
      const inverses = mesh.skeleton.boneInverses;
      for (let i = 0; i < inverses.length; i++) {
        inverses[i] = S.clone().multiply(inverses[i]).multiply(Binv);
      }
    }
    for (const mesh of rebound) mesh.bind(mesh.skeleton, mesh.matrixWorld);
    return holder;
  } else {
    const bone = findBone(root, manifest.attach.bone, manifest.slot);
    if (!bone) return null;
    const { position, rotation, scale } = manifest.attach;
    node.position.set(
      position[0] + fit.offset[0],
      position[1] + fit.offset[1],
      position[2] + fit.offset[2],
    );
    node.rotation.set(
      ((rotation[0] + frx) * Math.PI) / 180,
      ((rotation[1] + fry) * Math.PI) / 180,
      ((rotation[2] + frz) * Math.PI) / 180,
    );
    node.scale.setScalar((scale ?? 1) * fit.scale);
    bone.add(node);
  }

  return node;
}

/** Remove the accessory currently in a slot (no-op when empty). */
export function detachAccessory(root: THREE.Object3D, slot: AccessorySlotId): void {
  const reg = registry(root);
  const entry = reg.get(slot);
  if (!entry) return;
  for (const node of entry.nodes) node.parent?.remove(node);
  reg.delete(slot);
}

/** Remove every accessory the customizer attached. */
export function detachAllAccessories(root: THREE.Object3D): void {
  const reg = registry(root);
  for (const slot of [...reg.keys()]) detachAccessory(root, slot);
}

/** Manifest id currently attached in a slot, or null. */
export function accessoryInSlot(root: THREE.Object3D, slot: AccessorySlotId): string | null {
  return registry(root).get(slot)?.id ?? null;
}
