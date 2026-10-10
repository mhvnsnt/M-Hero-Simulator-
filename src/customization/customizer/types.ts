/**
 * customizer/types.ts — the data contract for the in-game character customizer.
 *
 * A CustomBuild is everything the player can change about a fighter, stored
 * per-fighter and re-applied to the live model whenever it loads (preview and
 * fight). Skin-tone likeness is LOCKED: no field here may recolor skin.
 *
 * Ownership: LANE-UI (customizer lane). The face-paint lane owns
 * src/game3d/customization/facepaint/index.ts and implements FacePaintModule;
 * this file only declares the shape we integrate against.
 */

/** One selectable iris color. `hex` is a CSS hex like "#4a2c14". */
export interface EyeColor {
  id: string;
  label: string;
  hex: string;
}

/** Body/face morph dials. All 0..1, 0.5 = the model's authored shape. */
export interface MorphValues {
  /** Arm/chest/thigh girth. */
  muscle: number;
  /** Leg length (feet stay planted — preview re-grounds the model). */
  height: number;
  /** Hip/shoulder width. */
  build: number;
  /** Jaw width / face fullness. */
  jaw: number;
}

export const DEFAULT_MORPHS: MorphValues = {
  muscle: 0.5,
  height: 0.5,
  build: 0.5,
  jaw: 0.5,
};

export const MORPH_KEYS = ["muscle", "height", "build", "jaw"] as const;
export type MorphKey = (typeof MORPH_KEYS)[number];

/**
 * Accessory slots. `chain` ships now (4 chain GLBs + manifest.json);
 * `hair` / `mask` / `hood` / `gloves` / `wristbands` / `shoes` read the
 * modeling lanes' manifest.json files (merged 2026-10-09: masks/hoods/hair,
 * gloves/wristbands/footwear). `facialHair` is scaffolded for a future lane.
 */
export const ACCESSORY_SLOTS = [
  "hair",
  "facialHair",
  "mask",
  "hood",
  "chain",
  "gloves",
  "wristbands",
  "shoes",
] as const;
export type AccessorySlotId = (typeof ACCESSORY_SLOTS)[number];

/**
 * manifest.json entry for one accessory asset, in the customizer's NORMALIZED
 * shape. The modeling lanes author two shapes (see accessories.ts):
 *  - chains (models/accessories): { id, label, slot, file, attach: { bone,
 *    position, rotation, scale } } inside a top-level { accessories: [...] }
 *  - merged 2026-10-09 lanes (masks/hoods/hair, gloves/wristbands/footwear):
 *    top-level array of { asset, file ("public/models/…"), attachBone,
 *    offset, scale, canonNotes, category? } — no id/label/slot/rotation.
 * The loader normalizes both into this shape; the rest of the customizer
 * only ever sees this.
 */
export interface AccessoryManifest {
  /** Stable id, e.g. "chain_gold_ashlane" or "mask_hollow_superdragon". */
  id: string;
  label: string;
  slot: AccessorySlotId;
  /** GLB path relative to public/, e.g. "models/accessories/chain_gold_ashlane_rigged.glb". */
  file: string;
  /**
   * Extra GLBs attached with the same selection (L/R pairs in the limb
   * lanes: gloves, wristbands, footwear share one asset id across two
   * files). Same slot + attach semantics as `file`.
   */
  pairFiles?: string[];
  /** True when the lane marks this asset canon (e.g. Hollow's Super Dragon
   * mask per the 2026-10-06 owner correction) — the UI badges it. */
  canon?: boolean;
  canonNotes?: string;
  attach: {
    /**
     * Bone to hang the accessory from. Exact name preferred; the loader
     * falls back to a case-insensitive pattern match (see accessories.ts).
     */
    bone: string;
    /** Local offset from the bone origin, in meters. */
    position: [number, number, number];
    /** Local euler rotation, in degrees. */
    rotation: [number, number, number];
    /** Uniform scale. Defaults to 1. */
    scale?: number;
  };
}

/**
 * Face-paint integration. The paint lane's module
 * (src/game3d/customization/facepaint/index.ts) is the ONLY import surface;
 * facepaint-adapter.ts wraps it. A build stores the selection as a single
 * string: either a canon preset id ("cipher-grin") or serialized
 * FacePaintLayer[] (the paint lane's serializeLayers). The adapter resolves
 * preset ids via getPreset() and falls back to parseLayers().
 */
export type FacePaintSpec = string;

/** The player's full build for one fighter. */
export interface CustomBuild {
  /** Roster id, e.g. "judas". */
  fighterId: string;
  /** Attire id from roster.ts, e.g. "classic". */
  attireId: string;
  /** Iris color id from the eye palette, e.g. "brown". */
  eyeColor: string;
  morphs: MorphValues;
  /** Accessory manifest id per slot; null = none. */
  accessories: Record<AccessorySlotId, string | null>;
  /** Face-paint style id; null = none. */
  facePaint: string | null;
}

export function defaultBuild(fighterId: string, attireId: string): CustomBuild {
  return {
    fighterId,
    attireId,
    eyeColor: "natural",
    morphs: { ...DEFAULT_MORPHS },
    accessories: {
      hair: null,
      facialHair: null,
      mask: null,
      hood: null,
      chain: null,
      gloves: null,
      wristbands: null,
      shoes: null,
    },
    facePaint: null,
  };
}
