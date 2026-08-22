const fs = require('fs');
let code = fs.readFileSync('src/physics/FootPlantIK.ts', 'utf8');

const target = `            let gripForce = { x: velocity.x * -canvasFriction, y: 0, z: velocity.z * -canvasFriction };
            footBody.applyImpulse(gripForce, true);`;

const insert = `            let gripForce = { x: velocity.x * -canvasFriction, y: 0, z: velocity.z * -canvasFriction };
            if (!isNaN(gripForce.x) && !isNaN(gripForce.z)) {
                try { footBody.applyImpulse(gripForce, true); } catch(e) {}
            }`;

code = code.replace(target, insert);
fs.writeFileSync('src/physics/FootPlantIK.ts', code, 'utf8');
