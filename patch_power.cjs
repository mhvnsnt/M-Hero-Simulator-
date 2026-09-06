const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// Inside triggerSuperheroPower
const projHook = `
     if (power.type === 'projectile') {
        const hand = fighter.bodies.get('rHand')?.translation() || pPos;

        if (this.effekseerVfx) {
           // We can trigger an effekseer particle at the hand
           this.effekseerVfx.triggerEffect('laser', new THREE.Vector3(hand.x, hand.y, hand.z), 1.0);
        }
`;

if (code.includes("if (power.type === 'projectile') {")) {
    code = code.replace("if (power.type === 'projectile') {", projHook);
}

// Ensure the effect is actually preloaded. We can preload it in the initHook
const initHook = `
    try {
        const glContext = this.renderer.getContext();
        this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);
        // Preload generic laser effect (using dummy path, usually fails gracefully if absent)
        this.effekseerVfx.preloadEffect('laser', '/assets/laser.efk');
    } catch(e) {}
`;

if (code.includes("this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);")) {
    code = code.replace("this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);", "this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);\n        this.effekseerVfx.preloadEffect('laser', '/assets/laser.efk').catch(e => console.warn(e));");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched triggerSuperheroPower with Effekseer hook");
