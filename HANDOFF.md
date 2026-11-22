# HANDOFF — M-Hero-Simulator-

**Last updated: 2026-11-22 (America/New_York).**
**Repo:** `mhvnsnt/M-Hero-Simulator-` (PUBLIC), default branch `main`.
**Purpose of this file:** any agent that picks up work here reads this FIRST, then the linked docs. It states what we've done, where we're at, and what we're working toward — so the owner can say "go to this repo, pick up the work" and you just know. Update this file in the same PR whenever the state changes (add, don't delete).

## 1. What this repo is

**M Hero Simulator — a hero-sim RPG / fighter / open-world sandbox.** Repo description: "Hero sim RPG / fighter/ open world sandbox". It is a Vite + TypeScript web game (~25 MB) with a Firebase backend (`firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules`), a Rapier physics setup (`test_rapier.cjs`, `test_rapier.js`, `patch_rapier.cjs`), and a long trail of patch scripts.

What is in here: the game (`src/`, `server.ts`, `public/`, `index.html`), Firebase config, and a very large pile of `patch_*.cjs` scripts — `patch_game.cjs`, `patch_game_combat.cjs`, `patch_game_logic.cjs`, `patch_game_rig.cjs`, `patch_game_vfx.cjs`, `patch_game_kinematic.cjs`, `patch_game_virtual.cjs`, `patch_animation.cjs`, `patch_camera.cjs`, `patch_flight.cjs`, `patch_foot.cjs`, `patch_haptics.cjs`, `patch_open_world.cjs`, `patch_power.cjs`, `patch_rapier.cjs`, `patch_server.cjs` (plus `patch_server2/3/4.cjs`), and many more — plus `fix_bvh.cjs`, `fix_hand.cjs`, `fix_haptics.cjs`, `update_server.cjs`, `README_GITHUB_SYNC.md`, `docs/`, and the agent working docs (`AGENTS.md`, `WORKING-METHOD.md`). Created 2026-08-22. There is no README. The patch pile is the story of this repo: the game was built by patching, over and over, and the patches were kept.

## 2. Where we're at

### DONE
- **Game staged (created 2026-08-22).** The hero-sim RPG/fighter/open-world sandbox as it stood, ~25 MB.
- **Anti-clobber laws merged (2026-10-17, PR #7).** The owner laws from the DXMMII 54k-file wipe, merged to main.
- **Working method statement (2026-10-27).** "Add working method statement" — the last commit on main.

### IN PROGRESS
- **Docs PR #9 — "Docs: sourcing rule (Mars, 2026-11-19)"** (open). The sourcing rule doc, waiting on merge.
- **Docs PR #10 — "Docs: pre-made parts first rule (Mars, 2026-11-20)"** (open). The pre-made-parts-first rule doc, waiting on merge.

### BLOCKED
- **Nothing is stated as blocked — but nothing has been committed since 2026-10-27.** The repo reads as paused. The patch pile is also a warning: any new work here starts by reading the patches, not by adding another one on top blind. Do not add a new `patch_*.cjs` without reading the ones it would touch.

## 3. What we're working toward

**The goal: M Hero Simulator as a playable hero sim — RPG progression, fighter combat, open-world sandbox, flight, powers, haptics.** The patch names are the feature list: combat, rig, VFX, kinematics, flight, foot placement, haptics, open world, powers, Rapier physics. The game was built toward all of that at once.

**The bar for done here:** the two open docs PRs merged, this HANDOFF.md kept current, and — before any new feature work — a read-through of the patch pile so the next change lands in the real code instead of becoming `patch_game_*.cjs` number fifty. If the owner ever points live work here again, that decision restarts this section — it has not happened.

## 4. Standing rules that apply here

- **Branch → PR → merge, always.** Never push to main directly. Add-only, zero-conflict PRs, no force pushes.
- **Checkpoint-and-save law:** CHECKPOINT.md first, update after every step; the repo is the save; resume, never restart.
- **No-temp-storage law:** nothing in /tmp or any wipeable location, ever. Everything goes straight into the repo or a durable folder the second it exists.
- **Real-source-only:** every part comes from the actual source code and files, wired up fully. No hand-tooled lookalikes, no fake panels.
- **No hand-tooling by patch pile:** read the existing patches before writing a new one. A fix lands in the real code where it belongs; a patch script is a last resort, not the method.
- **Never delete game files.** Game files (ISOs, ROMs, game archives, teardown source) are never auto-deleted. They come off local disk only after 100% hash/size-verified storage on GitHub OR TeraBox, retrievability proven, and the deletion logged.
- **No-gaps / solve-it law:** a gap or block is never the end of the work — route-switch until it's done or every reasonable route is exhausted with exact errors recorded.
- **Never kill in-progress work.** Never delete another lane's work without the standing verification rules.
- **Anti-clobber laws apply here** (merged PR #7, 2026-10-17) — they exist because a 54k-file wipe happened once. Read them in `docs/` before touching anything bulk.

## 5. Key files and paths

| What | Where |
|---|---|
| Game source | `src/` |
| Server | `server.ts`, `temp_server.ts` |
| Firebase backend | `firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules` |
| Physics (Rapier) | `test_rapier.cjs`, `test_rapier.js`, `patch_rapier.cjs` |
| Patch pile (read before patching) | `patch_*.cjs` (game, combat, logic, rig, vfx, kinematic, virtual, animation, camera, flight, foot, haptics, open_world, power, server, vfx, url, strike, timeout, schema, safe, nipple, joystick, joint, init, ingest, hand, create, balance, app, app_presets, app_ui, patch_*) |
| Fixes | `fix_bvh.cjs`, `fix_hand.cjs`, `fix_hand2.cjs`, `fix_haptics.cjs`, `fix_haptics2.cjs`, `fix_syntax.cjs` |
| GitHub sync notes | `README_GITHUB_SYNC.md` |
| Agent working docs | `AGENTS.md`, `WORKING-METHOD.md` |
| Docs (incl. owner laws) | `docs/` |
| App config | `package.json`, `vite.config.ts`, `tsconfig.json` |
| Open work | PR #9 (sourcing rule), PR #10 (pre-made parts first rule) |

## 6. Open decisions needing the owner

- **Is M Hero Simulator parked or live?** No commits since 2026-10-27, only docs PRs open. If it is parked behind the bigger games, say so and this repo stays preserved. If it is live, the next step is a patch-pile read-through before any feature work. His call — lanes do not decide the order of work across projects.
- **The two open docs PRs (#9, #10):** merge them or leave them? They are docs-only and add-only; merging is low-risk, but the call is his if he wants them held.

## 7. How to pick up

1. Read this HANDOFF.md first, then `AGENTS.md` and `WORKING-METHOD.md` in the repo.
2. Read the patch pile before touching game code — `patch_game*.cjs`, `patch_animation*.cjs`, `patch_rapier.cjs` first. Do not add a new patch blind.
3. Check the open PRs (#9, #10) — if they are still open, that is the next step.
4. Do not start new feature work here unless the owner has named this game live.
5. Resume from the stated next step — never restart, never re-derive finished work.
6. Land work branch → PR → merge, add-only. Stage finished work to the repo as it lands.
7. Update this HANDOFF.md in the same PR when the state changes. Verify with your own eyes before claiming anything done.
