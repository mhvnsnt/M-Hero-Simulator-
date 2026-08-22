export class JointMotors {
    rig: any;
    staminaSag: number;

    constructor(rig: any) {
        this.rig = rig;
        this.staminaSag = 1.0;
    }

    applyTorqueCoupling(hitForce: any, jointNode: any, parentNode?: any) {
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
    }
}
