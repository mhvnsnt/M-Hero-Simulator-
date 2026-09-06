const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const bvhExec = `
    if (this.bvhCombat) {
        // High-performance programmatic hit registration
        const radius = type.includes('Kick') ? 0.4 : 0.25;
        this.bvhCombat.executeMeleeHitreg(1.5, radius, baseDmg, force);
    }
`;

const oldStrike = `
    setTimeout(() => {
      if (!this.active) return;
      this.checkHitDistance(fighter, opp, baseDmg, limb, targetPos);
    }, 50);
`;

const newStrike = `
    setTimeout(() => {
      if (!this.active) return;
      if (this.bvhCombat) {
          // Temporarily attach to player group if needed, or pass it
          // Actually, our BvhCombatManager needs the current fighter's mesh to run executeMeleeHitreg
          // Let's create a temporary BVH manager for the current fighter
          const tempBvh = new BvhCombatManager(fighter.group, this.world);
          tempBvh.executeMeleeHitreg(1.5, type.includes('Kick') ? 0.4 : 0.25, baseDmg, force);
      } else {
          this.checkHitDistance(fighter, opp, baseDmg, limb, targetPos);
      }
    }, 50);
`;

if (code.includes(oldStrike)) {
    code = code.replace(oldStrike, newStrike);
} else {
    console.log("Could not find oldStrike to replace");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched executeStrike with BVH hitreg");
