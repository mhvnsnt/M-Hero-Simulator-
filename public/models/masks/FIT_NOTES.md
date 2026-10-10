# FIT_NOTES — LANE-3DHEAD accessories (masks / hoods / hair)

Authoring reference: `public/models/cast/ASTRID.glb`.
All assets in this folder are authored in ASTRID space and verified on ASTRID
(front / side / head-turn renders in `qc/`).

## Attach convention
- Each GLB carries its own small armature (`mixamorig:Spine2 → mixamorig:Neck →
  mixamorig:Head`) with bone world transforms copied from the reference
  skeleton. Meshes are skinned to it (masks/bandanas/hoods 100% Head;
  long hair / locs / drapes height-blended across Head/Neck/Spine2 so the
  federated spring-bone system in `src/game3d/federated/springbones.ts`
  and `SecondaryMotion` (`src/game3d/env-quality.ts`) can drive them).
- `manifest.json`: `{asset, file, attachBone, offset, scale, canonNotes}`.
  `attachBone` is the canonical `mixamorig:Head` (see `src/game3d/motion-bank.ts`);
  the codebase canonicalizes `mixamorig:`-prefixed, packed and stripped bone
  names (`src/game3d/mediapipe-mocap.ts`), so both `Head` (ASTRID-style) and
  `mixamorig:Head` (Tripo-style) bodies match.
- Bind via `attachPart()` (`src/game3d/quaternius.ts`) — bone-name rebind.

## Per-character scale (measured, head-bone height ratio vs ASTRID 1.5232m)
| character | head-bone y (glTF m) | scale |
|---|---|---|
| ASTRID (authoring ref) | 1.5232 | 1.0 |
| HOLLOW | 0.6790 | 0.4458 |
| ECHO | 0.6845 | 0.4494 |
| STATIC | 0.6845 | 0.4494 |

## Known per-character deltas (integration lane owns the tuning)
1. **Rest-pose orientation**: Tripo-rigged heads (HOLLOW/ECHO/STATIC) share a
   rotated head-bone rest orientation; ASTRID's is axis-aligned. Name-based
   rebinding inherits this delta. Full-head shells (masks) transfer acceptably;
   directional assets (hair fringes) show it visibly — compensate per character
   (orientation normalize or per-character offset in the UI manifest).
2. **ECHO face-forward outlier**: nose rel. head bone (y=-0.176, z=-0.026) vs
   ASTRID (y=-0.105, z=+0.076). Needs a positional nudge beyond uniform scale.
3. HOLLOW/STATIC facial proportions are close to ASTRID once scaled.

## QC evidence
`qc/<asset>_{astrid,echo,hollow,static}_{front,side,turn}.png` + per-asset
`*_contact.png` sheets. Checklist per asset: fits head, no face clipping,
symmetric, follows head bone on turn, canon likeness.
