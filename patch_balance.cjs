const fs = require('fs');
let code = fs.readFileSync('src/physics/BalancePolish.ts', 'utf8');

const target = `    triggerStaggerStep(fighter: any, dx: number, dz: number) {
        fighter.state = 'stagger';
        let pelvis = fighter.bodies.get('pelvis');
        if (pelvis) {
            // Apply catch-your-footing recovery force
            pelvis.applyImpulse({ x: -dx * 80, y: 20, z: -dz * 80 }, true);
            pelvis.applyTorqueImpulse({ x: dz * 40, y: 0, z: -dx * 40 }, true);
        }`;

const insert = `    triggerStaggerStep(fighter: any, dx: number, dz: number) {
        fighter.state = 'stagger';
        let pelvis = fighter.bodies.get('pelvis');
        if (pelvis) {
            if (isNaN(dx) || isNaN(dz)) return;
            // Apply catch-your-footing recovery force
            try {
                pelvis.applyImpulse({ x: -dx * 80, y: 20, z: -dz * 80 }, true);
                pelvis.applyTorqueImpulse({ x: dz * 40, y: 0, z: -dx * 40 }, true);
            } catch(e) {}
        }`;

code = code.replace(target, insert);
fs.writeFileSync('src/physics/BalancePolish.ts', code, 'utf8');
