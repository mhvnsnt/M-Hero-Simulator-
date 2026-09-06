const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// Add flight toggle hook
const flightHook = `
    if (this.keys['KeyV']) {
       if (this.player1.kinematic) {
           this.player1.kinematic.setFlightMode(!this.player1.kinematic.isFlying);
           if (this.player1.kinematic.isFlying && this.effekseerVfx) {
               // Activate wind distortion ring or trail
               this.player1.flightWindHandle = this.effekseerVfx.triggerEffect('wind_distortion', this.player1.group.position, 1.5);
           } else if (!this.player1.kinematic.isFlying && this.effekseerVfx && this.player1.flightWindHandle) {
               // Assuming a method exists to stop it or let it die out
               this.player1.flightWindHandle = null;
           }
       }
       this.keys['KeyV'] = false;
    }
`;

if (!code.includes("this.keys['KeyV']")) {
    code = code.replace("if (this.keys['KeyF'] || this.keys['KeyP'] || this.keys['BtnPower']) {", flightHook + "\n    if (this.keys['KeyF'] || this.keys['KeyP'] || this.keys['BtnPower']) {");
}

// In the update loop, update the flight trail location
const trailUpdate = `
    if (this.player1 && this.player1.flightWindHandle && this.effekseerVfx) {
        this.effekseerVfx.updateEffectTransform(this.player1.flightWindHandle, this.player1.group.position);
    }
`;

if (!code.includes("this.player1.flightWindHandle")) {
    code = code.replace("if (this.effekseerVfx) this.effekseerVfx.renderVfx(dtStr);", trailUpdate + "\n    if (this.effekseerVfx) this.effekseerVfx.renderVfx(dtStr);");
    code = code.replace("this.effekseerVfx.preloadEffect('laser', '/assets/laser.efk').catch(e => console.warn(e));", "this.effekseerVfx.preloadEffect('laser', '/assets/laser.efk').catch(e => console.warn(e));\n        this.effekseerVfx.preloadEffect('wind_distortion', '/assets/wind.efk').catch(e => console.warn(e));");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with Flight mode toggle and wind distortion hook.");
