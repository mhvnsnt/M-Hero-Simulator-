const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// Import VFXEngine
if (!code.includes("import { VFXEngine }")) {
    code = code.replace("import * as THREE from 'three';", "import * as THREE from 'three';\nimport { VFXEngine } from './vfx';");
}

// Add vfx to GameEngine class
if (!code.includes("vfx!: VFXEngine;")) {
    code = code.replace("scene!: THREE.Scene;", "scene!: THREE.Scene;\n  vfx!: VFXEngine;");
}

// Initialize VFXEngine
if (!code.includes("this.vfx = new VFXEngine(this.scene);")) {
    code = code.replace("this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });", "this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });\n    this.vfx = new VFXEngine(this.scene);");
}

// Spawn sparks on hit
const hitCheck = `if (healthRatio <= 0 && this.koCallback) {
                  this.koCallback(fighter === this.player1 ? 'P2' : 'P1');
               }`;

const hitCheckReplace = `if (healthRatio <= 0 && this.koCallback) {
                  this.koCallback(fighter === this.player1 ? 'P2' : 'P1');
               }
               
               // Spawn VFX on impact
               if (tPos) {
                   this.vfx.spawnImpact(new THREE.Vector3(tPos.x, tPos.y + 0.5, tPos.z));
               }`;
               
code = code.replace(hitCheck, hitCheckReplace);

// Update VFXEngine in animate
if (!code.includes("this.vfx.update(dtStr);")) {
    code = code.replace("this.updateParticles(dt);", "this.updateParticles(dt);\n    if (this.vfx) this.vfx.update(dtStr);");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts for VFX successfully.");
