const fs = require('fs');
let code = fs.readFileSync('src/physics/JointMotors.ts', 'utf8');

const target = `    applyTorqueCoupling(hitForce: any, jointNode: any, parentNode?: any) {
        let baseTension = 1500 * this.staminaSag;
        
        jointNode.applyImpulse(hitForce, true);
        
        if (parentNode) {
            let torsoForce = { x: hitForce.x * 0.6, y: hitForce.y * 0.6, z: hitForce.z * 0.6 };
            parentNode.applyImpulse(torsoForce, true);
        }
    }`;

const insert = `    applyTorqueCoupling(hitForce: any, jointNode: any, parentNode?: any) {
        let baseTension = 1500 * this.staminaSag;
        
        if (isNaN(hitForce.x) || isNaN(hitForce.y) || isNaN(hitForce.z)) return;
        
        try {
            jointNode.applyImpulse(hitForce, true);
            
            if (parentNode) {
                let torsoForce = { x: hitForce.x * 0.6, y: hitForce.y * 0.6, z: hitForce.z * 0.6 };
                if (!isNaN(torsoForce.x) && !isNaN(torsoForce.y) && !isNaN(torsoForce.z)) {
                    parentNode.applyImpulse(torsoForce, true);
                }
            }
        } catch(e) {}
    }`;

code = code.replace(target, insert);
fs.writeFileSync('src/physics/JointMotors.ts', code, 'utf8');
