const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const tpcClassOld = code.match(/export class ThirdPersonCamera \{[\s\S]*?    public update\(dt: number, orbitDelta: \{x: number, y: number\}\) \{[\s\S]*?        this\.camera\.lookAt\(this\.currentLookat\);\n    \}\n\}/)[0];

const tpcClassNew = `export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: THREE.Object3D | null = null;
    private currentPosition = new THREE.Vector3();
    private currentLookat = new THREE.Vector3();
    
    public radius = 5.0;
    public theta = 0; // Horizontal
    public phi = Math.PI / 2.5; // Vertical (radians)
    private actualRadius = 5.0; // Dynamic radius for SpringArm

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public setTarget(target: THREE.Object3D) {
        this.target = target;
        this.target.getWorldPosition(this.currentLookat);
        this.currentPosition.copy(this.camera.position);
    }

    public update(dt: number, orbitDelta: {x: number, y: number}, world?: any) {
        if (!this.target) return;
        
        // Apply orbit changes from Nipple.js (right stick)
        this.theta -= orbitDelta.x * dt * 2.0;
        this.phi -= orbitDelta.y * dt * 2.0;
        
        // Clamp phi to prevent flipping
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        const targetPos = new THREE.Vector3();
        this.target.getWorldPosition(targetPos);
        targetPos.y += 1.2; // Aim at head/shoulders

        // Default Spherical to Cartesian relative to target
        const offset = new THREE.Vector3(
            Math.sin(this.phi) * Math.sin(this.theta),
            Math.cos(this.phi),
            Math.sin(this.phi) * Math.cos(this.theta)
        ).normalize();
        
        // SpringArm Raycast using Rapier
        this.actualRadius = this.radius;
        if (world) {
            const ray = new world.math.Ray(targetPos, offset);
            // Raycast against solid geometry
            const maxToi = this.radius;
            const solid = true;
            const hit = world.castRay(ray, maxToi, solid);
            
            if (hit != null) {
                // We hit something! Pull camera in closer to avoid clipping
                this.actualRadius = Math.max(0.5, hit.toi - 0.2); // 0.2 margin
            }
        }

        const idealPos = targetPos.clone().add(offset.multiplyScalar(this.actualRadius));

        // Smooth LERP (Spring Arm effect)
        const t = 1.0 - Math.pow(0.001, dt);
        this.currentPosition.lerp(idealPos, t);
        this.currentLookat.lerp(targetPos, t);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }
}`;

code = code.replace(tpcClassOld, tpcClassNew);

// Update the call site in animate
code = code.replace("this.tpCamera.update(dt, this.virtualOrbit);", "this.tpCamera.update(dt, this.virtualOrbit, this.world);");

fs.writeFileSync('src/game.ts', code);
console.log("Patched ThirdPersonCamera with SpringArm Rapier raycast");
