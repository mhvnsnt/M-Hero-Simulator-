# M-Hero — Genre Research

**Lane 4 (M-Hero), genre research wave — 2026-10-09.**
**Scope:** superhero games and franchises; MDickie's *Super City* specifically; production lessons for rehabilitating M-Hero from a broken prototype into a real game.

**Conventions used below:** "RESEARCHED" = verified via the cited source. "RECOMMENDATION" = my synthesis for M-Hero, not a claim about any existing game. Where I could not verify something, it is marked **UNVERIFIED**.

**IP RULE (standing):** M-Hero ships ORIGINAL heroes only. The current prototype's placeholder Batman/Spider-Man/Superman/etc. labels must be replaced with original characters before anything public — never shipped. MDickie himself uses parody names with a legal disclaimer ("any similarities... purely coincidental"); M-Hero should go further and use wholly original characters and names, which is both legally safer and better for the owner's shared-universe canon.

---

## 1. Key Titles (what each is known for)

### 1.1 MDickie's Super City (2016) — THE DIRECT REFERENCE
- **Who:** Mat Dickie, solo UK indie dev famous for mobile wrestling games (*Wrestling Revolution*) — RESEARCHED ([MDickie wiki, mdickie.fandom.com](https://mdickie.fandom.com/wiki/Super_City)).
- **What it is:** "Superhero Sim" released 2016 (mobile, also Windows); over 150 characters, 30+ zone city map; a successor to *Weekend Warriors MMA* (2015). Special Edition ($2.99) unlocks the editor. Over 1M downloads claimed for the mobile version.
- **Core loop:** pick a faction (Heroes / Villains / Neutrals), roam the city, **fight for ownership of every zone** on the map. Owning all zones triggers a faction ending (Peace / Domination / Reverted / Independence).
- **Combat:** inherits the *Wrestling Revolution* melee system (A=Attack, B=Block, A+B=Grapple, R=Run, A+R=Big Attack, P=Pick-Up, T=Taunt, S=Special) plus superpowers: double-tap run to jump/fly, R+P = set fire, S = special power, tap portrait to transform (civilian ↔ superhuman). RESEARCHED via the official control list ([game-solver](https://game-solver.com/super-city-special-edition/)).
- **Attributes:** Strength, Speed, Defense — cap at 200% for superhumans, 99% for civilians. Strength gates weapon use (hammer needs 100%+ Strength).
- **Character design economy:** 150 characters share one skeletal/animation base — parody costumes + one or two signature powers each. This is the signature MDickie move: **quantity over fidelity**. Characters are procedural variations on one template.
- **Roster churn:** random characters with randomized names, visuals, powers, and attributes spawn infinitely in the free version to replace dead characters (paid version can be depopulated entirely). **M-Hero could adopt this as a live-city generator.** RESEARCHED ([MDickie wiki](https://mdickie.fandom.com/wiki/Super_City)).
- **Morality-by-faction:** three fixed factions with different win conditions; saving an enemy's life can flip them to your faction. Crude but effective morality: action → allegiance change.
- **What made it work solo:** one reusable engine (wrestling game → prison game → school game → superhero game — same core, re-skinned), procedural character generation, emergent sandbox stories instead of authored story missions, systems (zones, factions) doing the narrative work.

### 1.2 Marvel's Spider-Man (Insomniac, 2018) / Spider-Man 2 (2023)
- Known for the best traversal in the genre. Design principle from Insomniac's game director Ryan Smith: **the pendulum movement came first and foremost** — web-swinging was built before anything else, and players spend most of the game doing it. RESEARCHED ([Game Developer](https://www.gamedeveloper.com/design/making-insomniac-s-i-spider-man-i-do-what-a-spider-can)).
- Key tech: every web is anchored to a **real tagged attachment point** on buildings; the swing preserves momentum; release timing at different points of the arc gives different vectors; swing ending converts into running along walls. Streaming tiles load ~1 per second at top speed. RESEARCHED ([CBR](https://www.cbr.com/marvels-spider-man-how-web-swinging-works/)).
- Spider-Man 2 adds Web Wings (gliding that complements swinging, for crossing low-rise boroughs and rivers). Originally playtesters called the wings "an absolute mess" until the input was simplified to a single Triangle tap — **input design matters more than physics for whether a traversal power gets used**. RESEARCHED ([CheatCC](https://www.cheatcc.com/articles/how-insomniac-tuned-spider-man-s-swing-to-feel-so-fast/)).
- **Takeaway:** make ONE traversal power feel incredible before adding powers. Pick-up-and-play assists (auto-anchoring, momentum preservation) are what sell speed.

### 1.3 Batman: Arkham series (Rocksteady, 2009–2015)
- Known for **FreeFlow combat**: rhythm-based, strike/counter/chaining against groups, enemies as quick-priority puzzles (knives need multi-dodge, baton enemies only hit from behind, brutes tank hits, medics revive). RESEARCHED ([GameLoop AK writeup](https://www.gameloop.com/jp/game/steam-game/batman-arkham-knight-on-pc)).
- **Predator/Invisible Predator stealth**: vantage points (gargoyles, grates, ledges), silent takedowns, glide kicks; enemy fear as a mechanical system — the fewer left, the more erratic their behavior. RESEARCHED ([games.gg](https://games.gg/batman-arkham-asylum/)).
- **Traversal for a non-powered hero:** grapnel gun + gliding between vantage points; gadgets woven into combat combos (Batarang, Batclaw, explosive gel) rather than as separate modes.
- **Takeaway:** M-Hero's gadget-hero archetype should copy this: a gadget kit integrated into melee combos + grapnel/glider traversal + fear-based stealth — all achievable with cheap systems (points, counters, fear states).

### 1.4 inFAMOUS series (Sucker Punch, 2009–2014)
- Known for the **karma/morality system**: binary Good/Evil paths that change powers (each power has a good and evil variant), city reactions (pedestrians cheer, graffiti, news), story, and skill gating. RESEARCHED ([The Escapist](https://www.escapistmagazine.com/inFAMOUS-Second-Son-Review-The-Good-Son/), [VG247](https://www.vg247.com/infamous-second-son-moral-choices-explained-by-sucker-punch)).
- Delsin (Second Son): absorbs conduit powers — Smoke → Neon → Video → Concrete — **one character, multiple power "themes" swapped by draining environmental sources**. Each power has distinct traversal (Smoke dash through vents) and combat. Upgrades bought with collected shards.
- Caution: the karma flip could feel too fast/pacing-off (citizens cheering within an hour) — **reputation changes must be earned gradually to read as earned**. RESEARCHED ([VG247](https://www.vg247.com/infamous-second-son-the-conduit-revolution-starts-here-but-will-you-care-opinion)).

### 1.5 Prototype (Radical, 2009)
- Alex Mercer: shapeshifter — arms become **Blade / Claws / Whipfist / Hammerfists / Musclemass**, plus Shield / Armor defense; **Consume** absorbs enemies (health, memories, disguises for stealth infiltration). Disguise lasts while inconspicuous; using powers breaks it. RESEARCHED ([GameSpot](https://www.gamespot.com/articles/prototype-updated-impressions/1100-6184391/), [Gamia wiki](https://gamia-archive.fandom.com/wiki/Prototype)).
- Design lesson: **one body-horror power tree with hard tradeoffs** (Armor trades agility for toughness; only one offensive + one defensive power active at a time) gives huge variety from a single system. Consume = combat + stealth + progression in one verb.

### 1.6 Saints Row IV (Volition, 2013)
- Superpowers inside a simulation setting: super sprint, super jump, glide, telekinesis, freeze/fire blast, stomp — **upgradable, mix-and-matchable elements**, unlocked through campaign + side missions, powered by 1000+ collectible Data Clusters. Powers and weapons are used together with no toggling. RESEARCHED ([Game Informer](https://gameinformer.com/games/saints_row_iv/b/ps3/archive/2013/03/22/saints-pax-east.aspx), [Eurogamer](https://www.eurogamer.net/dubstep-guns-super-powers-and-a-playable-president-welcome-to-saints-row-4)).
- Warning: powers were so strong vehicles and guns became obsolete — **power creep must be balanced against the rest of the game** or content dies.

### 1.7 City of Heroes (Cryptic, 2004–2012)
- The genre's **character-creation benchmark**: costume creator "a virtual game in itself" — body sliders, dozens of costume parts mix-and-matched, independent color channels, up to 5 costumes per character, powers visual customization (recolor your effects). RESEARCHED ([TechRaptor](https://techraptor.net/gaming/features/city-of-heroes-character-creator), [RPGWatch](https://rpgwatch.com/forum/threads/city-of-heroes-state-of-the-game.5460/)).
- Power system: pick Origin (what made you super) → **Archetype** (class: Blaster, Tanker, Scrapper, Defender, Controller…) → **Primary + Secondary power sets** (e.g. Ice Blast + Electric Manipulation) → enhancement slots modify damage/accuracy/range/recharge. Origin is flavor (UNVERIFIED nuance: some sources say Origin gates nothing mechanically — mark as needing confirmation).
- Mission Architect (user-generated missions: objectives, layouts, custom enemy groups). RESEARCHED ([GameSpot](https://www.gamespot.com/articles/make-your-own-quests-in-city-of-heroes/1100-6234043/%25gameimage%25/)).
- Launch scope lesson (from Jack Emmert/Rock Paper Shotgun): focused launch on **two things done well — tight combat + huge character customization** — and grew from there. "You can only do so much well." RESEARCHED ([Rock Paper Shotgun](https://www.rockpapershotgun.com/the-making-of-city-of-heroes)).

### 1.8 DC Universe Online (2011)
- Character creation: Morality (Hero/Villain) → Mentor (Batman/Superman/Wonder Woman or Joker/Lex/Circe) → **Power** (Fire, Gadgets, Ice, Mental, Nature, Sorcery…) → **Movement mode** (Flight / Acrobatics / Super-Speed / Skimming) → Weapon → Costume. RESEARCHED ([rarityguide](http://www.rarityguide.com/articles/articles/465/1/DC-Universe-Online-Character-Creation-Guide/Page1.html), [DCUO wiki](https://dcuniverseonline.fandom.com/wiki/Movement_Modes)).
- Movement as a **first-class character choice**, not an afterthought: each mode has unique combat maneuvers (pulls, breakouts, supercharges) and traversal races.
- Exobytes story: a **diegetic excuse for infinite original player-characters** ("nanobots give powers to everyone") — M-Hero needs its own equivalent in-universe justification for the hero generator.

### 1.9 The cautionary titles (live-service superhero games)
- **Marvel's Avengers** (Crystal Dynamics, 2020): support ended Sept 30, 2023 after ~3 years; repeated reported causes: live-service grind, recycled content, weak matchmaking, monetization backlash (paid XP boosts). UNVERIFIED exact loss figure — reported as ~$60M+ but exact number varies by outlet ([Cosmic Book News](https://cosmicbook.news/marvels-avengers-dead), [Laptop Mag](https://www.laptopmag.com/gaming/suicide-squad-kill-the-justice-league)).
- **Suicide Squad: Kill the Justice League** (Rocksteady, 2024): Bloomberg reporting (via [FandomWire](https://fandomwire.com/rather-than-a-warning-suicide-squad-kill-the-justice-league-management-took-anthem-redfall-and-marvels-avengers-failures-as-proof-they-neednt-worry-rather-than-course-correct/)) described management dismissing concerns with "it'll come together" — toxic positivity as a failure mode.
- **Lesson:** the genre's failures are live-service scope failures, not power-design failures. Spider-Man 2 sold 5M copies in its first 11 days (reported — UNVERIFIED exact figure; source is a Laptop Mag comparison piece citing it) as a single-player story game. **M-Hero's business model must be premium/single-purchase or single-player-first, not live service.**

---

## 2. Power & Hero Systems Worth Stealing

| System | Source | Why it's cheap to build |
|---|---|---|
| **3-button stat trio (Strength/Speed/Defense)** | Super City | Numbers, not systems. 200% caps for supers. |
| **Faction zone-ownership metagame** | Super City | Zones are territory labels + colored map; endings are triggered by ownership, not scripted missions. Huge "game" from cheap systems. |
| **Transform (civilian ↔ superhuman), tap portrait** | Super City | Secret-identity duality = a toggle + a second moveset, not two characters. |
| **Pendulum traversal with auto-anchored points** | Spider-Man | Auto-attachment removes precision requirement; momentum preservation does the feel work. |
| **One-button glide (Web Wings)** | Spider-Man 2 | Tap to deploy, pairs with height gained from primary traversal. Lesson: simplify inputs until playtesters use the power. |
| **FreeFlow combat (strike/counter/enemy priority types)** | Arkham | Rhythm combat with enemy variants; no complex AI needed — enemy types ARE the difficulty. |
| **Predator fear states** | Arkham | Enemies get erratic as their count drops — fear as a scalar, not a script. |
| **Consume/disguise dual-use verb** | Prototype | One button = heal + stealth + intel. Three systems, one implementation. |
| **Modular body powers with hard tradeoffs** | Prototype | Blade/Claws/Whipfist are meshes + movesets on one rig; Armor trades speed. |
| **Elemental power modifiers (freeze→fire→mind control)** | Saints Row IV | One blast power, three status behaviors. Variants > new systems. |
| **Data Clusters / collectibles-as-progression** | Saints Row IV | Placed collectibles drive exploration; cheap content. |
| **Origin → Archetype → Primary/Secondary power sets → Enhancements** | City of Heroes | A character-builder taxonomy; lets players self-balance instead of designers hand-tuning 150 characters. |
| **Power-color customization** | City of Heroes | Recoloring VFX is nearly free and massively personal. |
| **Movement mode as character choice (Flight/Acrobatics/Super-Speed/Skimming)** | DCUO | One traversal system per mode; menu choice, not runtime complexity. |
| **Karma good/evil power variants** | inFAMOUS | One power, two behaviors unlocked by reputation scalar. |
| **Faction-flip by saving an enemy** | Super City | Morality as a game action, not a dialogue tree. |
| **Infinite procedural roster fill** | Super City | Random hero/villain generation replaces dead NPCs — the city never empties. |

### Power cost ranking (most game per cost, top first) — RECOMMENDATION
1. **Super-strength + super-jump** — pure numbers on existing physics. Near-zero animation cost.
2. **Flight (simplified: thrust vector, no complex aero)** — one movement mode; pairs with everything.
3. **Grapnel/rope traversal (auto-anchor)** — one rope-sim or even a lerp along a curve; cheap Spider-Man.
4. **Glide** — flight-lite; one input, height-dependent.
5. **Melee power set (FreeFlow-lite)** — one combo system, enemy types as variety.
6. **Projectile blast with element variants** — one projectile, damage/status swaps.
7. **Transform (civilian/hero)** — two states, one toggle.
8. **Telekinesis grab/throw** — physics grab on existing objects; expensive-feeling, moderately cheap.
9. **Shapeshift limbs** — meshes on the existing rig; moderate.
10. **Time/weather/mind-control** — new systems; save for later.

---

## 3. Art Direction Notes

- **Super City:** crude low-poly 3D, goofy and charming *on purpose*; fans cite the unpolished look as part of the appeal. RESEARCHED ([Waivio](https://www.waivio.com/@sidkay588/the-games-by-mdickie-are)). Lesson: **style honesty beats failed fidelity** — a consistent cheap look (PS1/stylized/low-poly) outperforms an attempted-realistic one that falls short. (Matches the standing Bannon/Brutal Fist art law: Brutal Fist's PS1 low-poly is intentional.)
- **City of Heroes:** comic-book stylization; the COSTUME is the art budget — character customization as the visual identity of the game.
- **Spider-Man:** high-fidelity Manhattan, but the art spend follows the traversal — the city is *read at speed*, so silhouette, lighting contrast, and landmark readability matter more than detail density.
- **inFAMOUS:** elemental power theming (Smoke/Neon/Video/Concrete) gives each power a distinct **color + particle language** — powers are visually identified by palette. Cheap, extremely readable.
- **Prototype:** dark, gritty, biological — powers read as body horror. One consistent "biomass" material sells the whole power tree.
- **M-Hero direction — RECOMMENDATION:** pick ONE cheap, consistent look (stylized low-poly comic or the existing prototype's direction, but committed). Give each power set a signature **color + particle language** (inFAMOUS model). Spend art budget on the costume/customization system (CoH model) — for a hero game, the player's hero IS the graphics showcase.

---

## 4. Production / Scope Lessons

1. **City of Heroes launch lesson (Jack Emmert):** "You can only do so much well" — launch focused on tight combat + huge customization, grew after. M-Hero should ship: one city district, one traversal power, one combat system, one hero creator. RESEARCHED ([RPS](https://www.rockpapershotgun.com/the-making-of-city-of-heroes)).
2. **The MDickie lesson:** one engine, many skins. M-Hero's prototype already has physics/rapier/flight/power patches — that's the engine. The rehabilitation is about **game systems on top**, not rebuilding tech.
3. **Small-team scope discipline (Against the Storm / Eremite):** 25% "safety net" budget line, and scope planned around what the team can actually finish. RESEARCHED ([Game Developer](https://www.gamedeveloper.com/production/here-s-how-the-small-team-behind-against-the-storm-kept-project-scope-in-check)).
4. **Shawn Layden's lesson (No Man's Sky):** small teams win by making the machine do the work — procedural generation for content (city, heroes, missions) instead of hand-authoring. RESEARCHED ([GamesIndustry.biz](https://www.gamesindustry.biz/shawn-laydens-advice-on-making-games-faster-and-cheaper?ref=gtg.benabraham.net)).
5. **The 8-person indie lesson:** don't compete with AAA scale; remove the frustrating parts, focus on the core loop you want to play. RESEARCHED (Medium/Far Far West piece — weaker source, treat as directional).
6. **Don't ship placeholder IP.** Legal flags tracked in MEMORY: meshes that are rips don't clear copyright via reskin. Same for borrowed hero labels. Original characters from day one of the public build.
7. **Live-service is the genre's graveyard.** Avengers, Suicide Squad, Anthem, Redfall — all live-service pivots that failed. Premium single-purchase (or single-player-first) is the proven lane: Spider-Man 2's reported 5M-in-11-days (UNVERIFIED exact figure).
8. **Traversal is the retention mechanic.** Insomniac built swinging first; Second Son reviewers cite traversal + combat as "the bulk of the fun." A superhero game whose movement feels bad is dead. M-Hero must nail ONE movement mode before adding powers.

---

## 5. SYNTHESIS — Recommendations for M-Hero

### 5.1 Target identity (RECOMMENDATION)
**M-Hero = MDickie's Super City formula + one great traversal power + City of Heroes character creation.** A sandbox city where you create an original hero (or villain), pick a movement mode and a power set, and fight for control of districts in a faction war — with an infinite procedural roster keeping the city alive. Not an Arkham clone (too authored), not an Avengers clone (live-service graveyard).

### 5.2 Design pillars (RECOMMENDATION)
1. **Original-hero creator first.** Origin → Archetype → Movement mode → Primary/Secondary power sets → costume. This IS the game for the first hour; CoH proved the creator is a game in itself.
2. **One city, faction war.** Districts owned by Heroes/Villains/Neutrals; take them over by completing district challenges (fights, rescues, chaos). Endings per faction, Super City style.
3. **Traversal before powers.** Ship with Flight OR Super-Speed OR Grapnel+Glide — whichever the prototype's flight patch supports best — and make it feel great. One input, auto-assists, momentum.
4. **FreeFlow-lite combat + 3-stat attributes.** Strength/Speed/Defense at 200% caps; enemy priority types (brute, medic, gunner, knife) instead of complex AI.
5. **Reputation/morality as a scalar.** Good/evil deeds move a karma meter; unlocks power variants; NPCs react (cheer/fear) — but pace it slowly (inFAMOUS pacing warning).
6. **Procedural city life.** Random hero/villain/civilian generation (Super City model) + placed Data-Cluster-style collectibles for upgrades. Systems over scripted missions.

### 5.3 Power roster — Phase 1 (RECOMMENDATION)
Ship these 6, nothing else, until Phase 1 is fun:
1. Super-strength (melee damage/throw) — numbers.
2. Super-jump — numbers + animation.
3. Flight (or grapnel+glide — pick ONE traversal).
4. Blast (element variants: fire/freeze/force — status swaps).
5. Transform (civilian ↔ hero — stealth/identity play).
6. Telekinesis grab/throw (physics on existing props).

Phase 2 (only after Phase 1 ships): shapeshift limbs, karma power variants, fear-state stealth, flight races.

### 5.4 Prioritized rehabilitation path for the broken prototype (RECOMMENDATION)
The prototype at `~/workspace/game-sweep/M-Hero-Simulator-` already has: Three.js/Vite scaffold, Rapier physics, flight patch, power patch, open-world patch, joystick support, procedural audio, VFX. What's broken: it's a combat-sim scaffold with placeholder borrowed-IP labels and ~40 unconsolidated patch scripts (`patch_*.cjs`) — evidence of patch-on-patch development with no consolidation pass.

**Phase 0 — Stabilize (do first, ~1–2 sessions)**
1. Consolidate or delete the 40+ `patch_*.cjs` / `fix_*.cjs` / `update_server.cjs` scripts: anything applied gets folded into `src/` and the script deleted; anything unapplied gets evaluated once, then deleted. No new patch scripts — direct `src/` edits going forward.
2. Get the build green and the game bootable in-browser; record a 60-second playtest clip.
3. Delete `node_modules` bloat from any future commits (check what's committed — keep the repo lean; standing disk rules apply).

**Phase 1 — De-IP and identity (before anything public)**
4. Replace ALL borrowed-IP labels (Batman, Spider-Man, Superman, etc. in `src/App.tsx`, `src/ProceduralAudio.ts`, `src/game.ts`, `src/types.ts`) with original hero/villain names from the owner's canon (ask owner for names or generate originals; file under original names).
5. Introduce the hero taxonomy skeleton: Origin → Archetype → Movement → Power sets (data model only, UI later).

**Phase 2 — Core loop (the actual game)**
6. Pick ONE traversal mode; make it feel great (input simplicity first — Spider-Man 2's Triangle lesson).
7. FreeFlow-lite melee + 3 stats (Strength/Speed/Defense) + 3–4 enemy types.
8. One city district with a zone-ownership HUD; district challenges = fight waves / rescue / chaos events.
9. One power set fully working end-to-end (blast with element variants is the cheapest impressive one).

**Phase 3 — Creator + city life**
10. Hero creator UI (costume pieces + color channels + power-color VFX).
11. Procedural NPC hero/villain/civilian generation; faction war across 3+ districts; endings.
12. Collectibles-as-progression (clusters → upgrades).

**Phase 4 — Polish/polish-gates**
13. Karma scalar + NPC reactions; fear states; power variants.
14. Performance pass for mobile; then (and only then) suite ports as Track 1 per standing plan.

**Non-negotiable gates:** no public build with borrowed-IP labels; no new powers until the current set is fun; commit incrementally (branch → PR → merge per standing rule).

---

## 6. Sources

All URLs fetched or returned via `browser.search`/`browser.open` text fetch during this research (2026-10-09). No live browser visits; all are text reads.

**MDickie / Super City:**
- https://mdickie.fandom.com/wiki/Super_City — systems, factions, attributes, transformations, controls
- https://mdickie.fandom.com/wiki/Infinite_Lives — successor context
- https://game-solver.com/super-city-special-edition/ — official control list, Special Edition details
- https://kotaku.com/games/super-city-superhero-sim — summary
- https://www.waivio.com/@sidkay588/the-games-by-mdickie-are — review: chaos as appeal, crude art as charm
- https://tig.fandom.com/wiki/Mat_Dickie — release history
- http://www.MDickie.com/images/mags/adobe_study.pdf — Adobe case study on Dickie's solo pipeline

**Spider-Man (Insomniac):**
- https://www.gamedeveloper.com/design/making-insomniac-s-i-spider-man-i-do-what-a-spider-can — traversal-first design
- https://www.cbr.com/marvels-spider-man-how-web-swinging-works/ — anchor points, momentum, streaming
- https://www.psu.com/news/marvels-spider-man-2-brings-new-open-world-traversal-in-the-shape-of-web-wings/ — Web Wings
- https://www.cheatcc.com/articles/how-insomniac-tuned-spider-man-s-swing-to-feel-so-fast/ — input-simplification lesson
- https://press-start.com.au/features/2023/10/20/we-spoke-to-insomniac-about-bringing-new-york-to-life-in-marvels-spider-man-2/amp/ — city design

**Arkham / inFAMOUS / Prototype / Saints Row IV:**
- https://www.gameloop.com/jp/game/steam-game/batman-arkham-knight-on-pc — FreeFlow, predator, enemy types
- https://games.gg/batman-arkham-asylum/ — Invisible Predator, detective mode
- https://hypercombogamer.com/batman-arkham-city-goty-review-pc/ — fear as a mechanic
- https://www.escapistmagazine.com/inFAMOUS-Second-Son-Review-The-Good-Son/ — karma, power themes, shards
- https://www.vg247.com/infamous-second-son-moral-choices-explained-by-sucker-punch — morality design intent
- https://www.vg247.com/infamous-second-son-the-conduit-revolution-starts-here-but-will-you-care-opinion — karma pacing warning
- https://www.gamespot.com/articles/prototype-updated-impressions/1100-6184391/ — powers, consume, disguise
- https://gamia-archive.fandom.com/wiki/Prototype — full power list, tradeoffs
- https://gameinformer.com/games/saints_row_iv/b/ps3/archive/2013/03/22/saints-pax-east.aspx — superpower design
- https://www.eurogamer.net/dubstep-guns-super-powers-and-a-playable-president-welcome-to-saints-row-4 — simulation framing
- http://worthplaying.com/article/2013/8/19/reviews/90133-xbox-360-review-saints-row-iv/ — element mixing, power creep warning

**City of Heroes / DCUO:**
- https://www.rockpapershotgun.com/the-making-of-city-of-heroes — launch scope focus
- https://techraptor.net/gaming/features/city-of-heroes-character-creator — costume creator
- https://rpgwatch.com/forum/threads/city-of-heroes-state-of-the-game.5460/ — archetypes, powersets, enhancements
- https://www.gamespot.com/articles/make-your-own-quests-in-city-of-heroes/1100-6234043/%25gameimage%25/ — Mission Architect
- http://www.rarityguide.com/articles/articles/465/1/DC-Universe-Online-Character-Creation-Guide/Page1.html — DCUO creation
- https://dcuniverseonline.fandom.com/wiki/Movement_Modes — movement modes as combat systems

**Production / cautionary:**
- https://www.gamedeveloper.com/production/here-s-how-the-small-team-behind-against-the-storm-kept-project-scope-in-check — 25% safety net
- https://www.gamesindustry.biz/shawn-laydens-advice-on-making-games-faster-and-cheaper?ref=gtg.benabraham.net — procedural tooling
- https://www.gamedeveloper.com/production/-ship-a-good-game-learn-from-it-and-build-from-there-lessons-from-going-indie-after-a-decade-at-id-software — indie scope discipline
- https://cosmicbook.news/marvels-avengers-dead — Avengers shutdown
- https://www.laptopmag.com/gaming/suicide-squad-kill-the-justice-league — live-service graveyard comparison
- https://fandomwire.com/rather-than-a-warning-suicide-squad-kill-the-justice-league-management-took-anthem-redfall-and-marvels-avengers-failures-as-proof-they-neednt-worry-rather-than-course-correct/ — toxic positivity failure mode
- https://www.denofgeek.com/games/why-marvel-games-keep-failing/ — Marvel games overview
