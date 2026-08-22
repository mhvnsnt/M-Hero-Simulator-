export class BalancePolish {
    world: any;

    constructor(physicsWorld: any) {
        this.world = physicsWorld;
    }

    evaluateCenterOfMass(comVector: any, supportPolygon: any, fighter: any) {
        let dx = comVector.x - supportPolygon.x;
        let dz = comVector.z - supportPolygon.z;
        let drift = Math.sqrt(dx*dx + dz*dz);
        if (drift > 0.3 && fighter.state !== 'grounded' && fighter.state.indexOf('slammed') === -1) {
            this.triggerStaggerStep(fighter, dx, dz);
        }
    }

    triggerStaggerStep(fighter: any, dx: number, dz: number) {
        fighter.state = 'stagger';
        let pelvis = fighter.bodies.get('pelvis');
        if (pelvis) {
            if (isNaN(dx) || isNaN(dz)) return;
            // Apply catch-your-footing recovery force
            try {
                pelvis.applyImpulse({ x: -dx * 80, y: 20, z: -dz * 80 }, true);
                pelvis.applyTorqueImpulse({ x: dz * 40, y: 0, z: -dx * 40 }, true);
            } catch(e) {}
        }
        setTimeout(() => {
            if (fighter.state === 'stagger') fighter.state = 'standing';
        }, 400);
    }
}
