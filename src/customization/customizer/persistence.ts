/**
 * customizer/persistence.ts — save/load the player's custom builds.
 *
 * Follows the repo's save conventions (src/game3d/saves.ts):
 *  - versioned envelope { schemaVersion, updatedAt, data }
 *  - forward-only migrations, migrate-on-copy before write
 *  - idb-keyval when installed, localStorage fallback (same optional-dep pattern)
 *
 * Builds are keyed by roster fighter id. One slot per fighter; saving is
 * per-build and never touches the campaign save.
 */

import { defaultBuild, type CustomBuild } from "./types";

const SCHEMA_VERSION = 1;
const STORE_KEY = "mhero:customizer:builds";
const BACKUP_KEY = "mhero:customizer:builds:backup";

interface Envelope {
  schemaVersion: number;
  updatedAt: number;
  data: Record<string, CustomBuild>;
}

type KV = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
};

let kvPromise: Promise<KV> | null = null;

// Non-literal specifier on purpose: idb-keyval is an OPTIONAL dependency
// (not in package.json — same pattern as saves.ts). A literal
// import("idb-keyval") makes the production build fail at resolve time when
// the package isn't installed. @vite-ignore leaves it as a runtime dynamic
// import: it resolves when installed, rejects (caught below) when not, and
// the localStorage fallback applies. De-facto behavior today is localStorage.
const IDB_KEYVAL_SPEC = "idb-keyval";

/** Same backend discipline as saves.ts: IndexedDB when present, localStorage fallback. */
function backend(): Promise<KV> {
  if (!kvPromise) {
    kvPromise = import(/* @vite-ignore */ IDB_KEYVAL_SPEC)
      .then((m) => ({
        get: m.get as KV["get"],
        set: m.set as KV["set"],
      }))
      .catch(() => ({
        get: async (key: string) => {
          const raw = localStorage.getItem(key);
          return raw ? (JSON.parse(raw) as unknown) : undefined;
        },
        set: async (key: string, value: unknown) => {
          localStorage.setItem(key, JSON.stringify(value));
        },
      }));
  }
  return kvPromise;
}

type Migration = (data: Record<string, CustomBuild>) => Record<string, CustomBuild>;

/** Forward-only. Add a new entry (never edit old ones) when the schema changes. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 is the first schema — no migrations yet.
};

function migrate(envelope: Envelope): Envelope {
  if (envelope.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `Customizer builds are from a newer game version (v${envelope.schemaVersion} > v${SCHEMA_VERSION})`,
    );
  }
  let { schemaVersion, data } = envelope;
  let d = data;
  while (schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[schemaVersion];
    if (!step) throw new Error(`No migration path from customizer builds v${schemaVersion}`);
    d = step(d);
    schemaVersion++;
  }
  return { ...envelope, schemaVersion, data: d };
}

function sanitize(raw: unknown): Record<string, CustomBuild> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, CustomBuild> = {};
  for (const [fighterId, b] of Object.entries(raw as Record<string, unknown>)) {
    if (!b || typeof b !== "object") continue;
    const bb = b as Partial<CustomBuild>;
    // Merge over defaults so older/partial saves always produce a valid build.
    const base = defaultBuild(fighterId, typeof bb.attireId === "string" ? bb.attireId : "");
    out[fighterId] = {
      ...base,
      ...bb,
      fighterId,
      morphs: { ...base.morphs, ...(bb.morphs ?? {}) },
      accessories: { ...base.accessories, ...(bb.accessories ?? {}) },
    };
  }
  return out;
}

/** Load every saved build, keyed by fighter id. Never throws — returns {} when empty/corrupt. */
export async function loadAllBuilds(): Promise<Record<string, CustomBuild>> {
  try {
    const kv = await backend();
    const raw = (await kv.get(STORE_KEY)) as Envelope | undefined;
    if (!raw || typeof raw.schemaVersion !== "number") return {};
    const migrated = migrate(structuredClone(raw));
    if (migrated.schemaVersion !== raw.schemaVersion) {
      await kv.set(STORE_KEY, migrated);
    }
    return sanitize(migrated.data);
  } catch (e) {
    console.error("Customizer builds unreadable:", e);
    return {};
  }
}

/** Load the saved build for one fighter, or null when the player never saved one. */
export async function loadBuild(fighterId: string): Promise<CustomBuild | null> {
  const all = await loadAllBuilds();
  return all[fighterId] ?? null;
}

/** Save (or overwrite) the build for one fighter. Keeps the previous store as backup. */
export async function saveBuild(build: CustomBuild): Promise<void> {
  const kv = await backend();
  const all = await loadAllBuilds();
  all[build.fighterId] = structuredClone(build);
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    data: all,
  };
  const prev = await kv.get(STORE_KEY);
  if (prev) await kv.set(BACKUP_KEY, prev);
  await kv.set(STORE_KEY, envelope);
}

/** Delete the saved build for one fighter (revert to authored). */
export async function deleteBuild(fighterId: string): Promise<void> {
  const kv = await backend();
  const all = await loadAllBuilds();
  if (!(fighterId in all)) return;
  delete all[fighterId];
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    data: all,
  };
  const prev = await kv.get(STORE_KEY);
  if (prev) await kv.set(BACKUP_KEY, prev);
  await kv.set(STORE_KEY, envelope);
}

/** Export all builds as a downloadable JSON file (offline backup / transfer). */
export function exportBuildsFile(builds: Record<string, CustomBuild>): void {
  const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), builds }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ashlane-customizer-builds-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
