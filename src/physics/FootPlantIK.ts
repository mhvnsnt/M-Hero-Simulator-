export class FootPlantIK {
    enforceGrounding(footBody: any, canvasFriction: number) {
        if (!footBody) return;
        let velocity = footBody.linvel();
        
        let speed = Math.sqrt(velocity.x*velocity.x + velocity.z*velocity.z);
        
        // Only slide when the hit overpowers the grip limit
        if (speed < 1.0 && speed > 0.01) {
            let gripForce = { x: velocity.x * -canvasFriction, y: 0, z: velocity.z * -canvasFriction };
            if (!isNaN(gripForce.x) && !isNaN(gripForce.z)) {
                try { footBody.applyImpulse(gripForce, true); } catch(e) {}
            }
        }
    }
}
