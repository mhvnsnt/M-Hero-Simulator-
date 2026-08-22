export class GrappleMatrix {
    world: any;
    RAPIER: any;

    constructor(world: any, rapier: any) {
        this.world = world;
        this.RAPIER = rapier;
    }

    executeVisceralSlam(attackerBody: any, victimBody: any, contactPoint: any) {
        if (!attackerBody || !victimBody) return;

        let jointParams = this.RAPIER.JointData.spherical(
            { x: 0, y: 0.5, z: 0.5 },
            { x: 0, y: -0.5, z: -0.5 }
        );
        
        // The active body couples with the victim to transfer raw weight
        let joint = this.world.createImpulseJoint(jointParams, attackerBody, victimBody, true);

        // Break the joint after a short dynamic fold to complete the slam variance
        setTimeout(() => {
            try {
                this.world.removeImpulseJoint(joint);
            } catch(e) {}
        }, 600);
    }
}
