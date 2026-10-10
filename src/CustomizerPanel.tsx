/**
 * CustomizerPanel — M-Hero's in-menu character customizer.
 *
 * Lives inside the game's HUD flow (opened from the main menu). Drives
 * CustomizerPreview with the ACTUAL fighter (procedural group clone) on a
 * zoomable live 3D stage. Every control applies to the live model
 * immediately; Save persists the build per fighter and applies it to the
 * live game fighter.
 *
 * Sections: Fighter / Gear (accessories) / Body (morphs) / Eyes / Face paint.
 * Skin-tone likeness is LOCKED — nothing here recolors skin.
 */
import { useEffect, useRef, useState } from "react";
import { CustomizerPreview } from "./customization/customizer/preview";
import { EYE_COLOR_PALETTE } from "./customization/customizer/eye-colors";
import { MORPH_DEFS } from "./customization/customizer/morphs";
import {
  ACCESSORY_SLOTS,
  defaultBuild,
  type AccessorySlotId,
  type CustomBuild,
} from "./customization/customizer/types";
import {
  loadBuild,
  saveBuild,
  deleteBuild,
} from "./customization/customizer/persistence";
import {
  applyBuildToFighter,
  fighterMeshes,
  fighterRoot,
  getFighterCapabilities,
  manifestsBySlot,
  type FighterLike,
} from "./customization/mhero-adapter";
import type { AccessoryManifest } from "./customization/customizer/types";
import type { GameEngine } from "./game";

const SLOT_LABELS: Record<AccessorySlotId, string> = {
  hair: "Hair",
  facialHair: "Facial hair",
  mask: "Mask",
  hood: "Hood",
  chain: "Chain",
  gloves: "Gloves",
  wristbands: "Wristbands",
  shoes: "Shoes",
};

interface Props {
  engine: GameEngine;
  onClose: () => void;
}

export function CustomizerPanel({ engine, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<CustomizerPreview | null>(null);
  const [fighterIdx, setFighterIdx] = useState<0 | 1>(0);
  const [build, setBuild] = useState<CustomBuild>(() => defaultBuild("p1", ""));
  const [slotManifests, setSlotManifests] = useState<Record<AccessorySlotId, AccessoryManifest[]>>(
    {} as Record<AccessorySlotId, AccessoryManifest[]>
  );
  const [caps, setCaps] = useState({ morphs: false, accessories: true, eyeColors: false, facePaint: false, notes: [] as string[] });
  const [status, setStatus] = useState("");
  const buildRef = useRef(build);
  buildRef.current = build;

  const fighter: FighterLike = fighterIdx === 0 ? engine.player1 : engine.player2;
  const fighterId = fighterIdx === 0 ? "p1" : "p2";
  const fighterName = fighter?.superheroConfig?.name ?? (fighterIdx === 0 ? "Nightguard" : "Skywire");

  // Init preview + load manifests + saved build.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = new CustomizerPreview(canvas);
    previewRef.current = preview;
    preview.onStatus = (s) => {
      if (s.error) setStatus(s.error);
    };
    let cancelled = false;
    (async () => {
      const bySlot = await manifestsBySlot();
      if (cancelled) return;
      setSlotManifests(bySlot);
      const f = fighterIdx === 0 ? engine.player1 : engine.player2;
      const root = fighterRoot(f);
      setCaps(getFighterCapabilities(f));
      await preview.loadProceduralFighter(fighterMeshes(f), fighterIdx === 0 ? "p1" : "p2");
      if (cancelled) return;
      const saved = await loadBuild(fighterIdx === 0 ? "p1" : "p2");
      const b = saved ?? defaultBuild(fighterIdx === 0 ? "p1" : "", "");
      setBuild(b);
      await preview.applyBuild(b);
      // Apply to the live fighter too (WYSIWYG in-game).
      await applyBuildToFighter(f, b);
    })();
    return () => {
      cancelled = true;
      preview.dispose();
      previewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighterIdx]);

  const updateBuild = async (next: CustomBuild) => {
    setBuild(next);
    buildRef.current = next;
    const preview = previewRef.current;
    if (preview) await preview.applyBuild(next);
    // Live-apply to the game fighter.
    await applyBuildToFighter(fighter, next);
  };

  const setAccessory = (slot: AccessorySlotId, id: string | null) => {
    updateBuild({
      ...buildRef.current,
      accessories: { ...buildRef.current.accessories, [slot]: id },
    });
  };

  const setMorph = (key: string, v: number) => {
    updateBuild({
      ...buildRef.current,
      morphs: { ...buildRef.current.morphs, [key]: v },
    });
  };

  const setEyeColor = (id: string) => {
    updateBuild({ ...buildRef.current, eyeColor: id });
  };

  const handleSave = async () => {
    saveBuild(buildRef.current);
    await applyBuildToFighter(fighter, buildRef.current);
    setStatus(`Saved ${fighterName}'s build.`);
  };

  const handleReset = async () => {
    const b = defaultBuild(fighterId, "");
    deleteBuild(fighterId);
    await updateBuild(b);
    setStatus(`Reset ${fighterName} to the authored look.`);
  };

  const morphKeys = MORPH_DEFS.filter((d) =>
    caps.morphs
  ).map((d) => d.key);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(8,6,14,0.97)",
        display: "flex",
        flexDirection: "column",
        color: "#f2ede2",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #2a2438" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Customize Hero</h2>
        <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
          {([0, 1] as const).map((i) => (
            <button
              key={i}
              onClick={() => setFighterIdx(i)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: fighterIdx === i ? "2px solid #b49aff" : "1px solid #3a3350",
                background: fighterIdx === i ? "#2a2140" : "#16121f",
                color: "#f2ede2",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {i === 0 ? (engine.player1?.superheroConfig?.name ?? "Nightguard") : (engine.player2?.superheroConfig?.name ?? "Skywire")}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #3a3350",
            background: "#16121f",
            color: "#f2ede2",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>

      {/* Main */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, flexWrap: "wrap" }}>
        {/* Preview */}
        <div style={{ flex: "1 1 320px", minHeight: 280, position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} />
          <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 12, opacity: 0.7 }}>
            Drag to orbit · scroll to zoom
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: "1 1 320px", overflowY: "auto", padding: 16, borderLeft: "1px solid #2a2438", maxHeight: "100%" }}>
          {/* Gear */}
          <h3 style={{ margin: "0 0 8px" }}>Gear</h3>
          {ACCESSORY_SLOTS.map((slot) => (
            <div key={slot} style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
                {SLOT_LABELS[slot]}
              </label>
              <select
                value={build.accessories[slot] ?? ""}
                onChange={(e) => setAccessory(slot, e.target.value || null)}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: 15,
                  borderRadius: 8,
                  background: "#16121f",
                  color: "#f2ede2",
                  border: "1px solid #3a3350",
                }}
              >
                <option value="">None</option>
                {(slotManifests[slot] ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Body */}
          <h3 style={{ margin: "16px 0 8px" }}>Body</h3>
          {morphKeys.length === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7 }}>No morph dials found on this fighter.</p>
          )}
          {MORPH_DEFS.filter((d) => morphKeys.includes(d.key)).map((d) => (
            <div key={d.key} style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 13, opacity: 0.8, marginBottom: 4, textTransform: "capitalize" }}>
                {d.key}: {(build.morphs[d.key] ?? 0.5).toFixed(2)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={build.morphs[d.key] ?? 0.5}
                onChange={(e) => setMorph(d.key, parseFloat(e.target.value))}
                onDoubleClick={() => setMorph(d.key, 0.5)}
                style={{ width: "100%" }}
              />
            </div>
          ))}

          {/* Eyes */}
          <h3 style={{ margin: "16px 0 8px" }}>Eyes</h3>
          {!caps.eyeColors ? (
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Eye colors need a dedicated iris material — this fighter's eyes are baked into the head mesh.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EYE_COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEyeColor(c.id)}
                  title={c.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: build.eyeColor === c.id ? "3px solid #b49aff" : "2px solid #3a3350",
                    background: c.hex,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}

          {/* Face paint */}
          <h3 style={{ margin: "16px 0 8px" }}>Face Paint</h3>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Face paint needs a face UV profile for this head — not authored yet.
          </p>

          {/* Save / Reset */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: 16,
                borderRadius: 10,
                border: "none",
                background: "#b49aff",
                color: "#0a0910",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save Build
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: "12px 18px",
                fontSize: 16,
                borderRadius: 10,
                border: "1px solid #3a3350",
                background: "#16121f",
                color: "#f2ede2",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
          {status && <p style={{ fontSize: 13, marginTop: 10, opacity: 0.9 }}>{status}</p>}
          {caps.notes.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6 }}>
              {caps.notes.map((n, i) => (
                <p key={i} style={{ margin: "4px 0" }}>{n}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
