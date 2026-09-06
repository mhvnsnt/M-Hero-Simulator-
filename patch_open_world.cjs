const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const tpcClass = `
export class ThirdPersonCamera {
    private camera: THREE.PerspectiveCamera;
    private target: THREE.Object3D | null = null;
    private currentPosition = new THREE.Vector3();
    private currentLookat = new THREE.Vector3();
    
    public radius = 5.0;
    public theta = 0; // Horizontal
    public phi = Math.PI / 2.5; // Vertical (radians)

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public setTarget(target: THREE.Object3D) {
        this.target = target;
        this.target.getWorldPosition(this.currentLookat);
        this.currentPosition.copy(this.camera.position);
    }

    public update(dt: number, orbitDelta: {x: number, y: number}) {
        if (!this.target) return;
        
        // Apply orbit changes from Nipple.js (right stick)
        this.theta -= orbitDelta.x * dt * 2.0;
        this.phi -= orbitDelta.y * dt * 2.0;
        
        // Clamp phi to prevent flipping
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        const targetPos = new THREE.Vector3();
        this.target.getWorldPosition(targetPos);
        targetPos.y += 1.2; // Aim at head/shoulders

        // Spherical to Cartesian relative to target
        const idealPos = new THREE.Vector3(
            targetPos.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta),
            targetPos.y + this.radius * Math.cos(this.phi),
            targetPos.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta)
        );

        // Smooth LERP (Spring Arm effect)
        const t = 1.0 - Math.pow(0.001, dt);
        this.currentPosition.lerp(idealPos, t);
        this.currentLookat.lerp(targetPos, t);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }
}

export class ChunkManager {
    private scene: THREE.Scene;
    private world: RAPIER.World;
    private chunkSize = 40;
    private loadedChunks = new Map<string, { group: THREE.Group, bodies: RAPIER.RigidBody[] }>();
    
    constructor(scene: THREE.Scene, world: RAPIER.World) {
        this.scene = scene;
        this.world = world;
    }

    public update(playerPos: THREE.Vector3) {
        const cx = Math.floor(playerPos.x / this.chunkSize);
        const cz = Math.floor(playerPos.z / this.chunkSize);

        const neededChunks = new Set<string>();
        // 3x3 Matrix loading around player
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                neededChunks.add(\`\${cx + x},\${cz + z}\`);
            }
        }

        // Unload old
        for (const [key, chunk] of this.loadedChunks.entries()) {
            if (!neededChunks.has(key)) {
                this.scene.remove(chunk.group);
                chunk.bodies.forEach(b => this.world.removeRigidBody(b));
                this.loadedChunks.delete(key);
            }
        }

        // Load new
        for (const key of neededChunks) {
            if (!this.loadedChunks.has(key)) {
                this.loadChunk(key);
            }
        }
    }

    private loadChunk(key: string) {
        const [cx, cz] = key.split(',').map(Number);
        const group = new THREE.Group();
        const bodies: RAPIER.RigidBody[] = [];
        
        const offsetX = cx * this.chunkSize;
        const offsetZ = cz * this.chunkSize;

        // Ground Plane for the chunk
        const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: (cx + cz) % 2 === 0 ? 0x2d3a3a : 0x223333,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(offsetX + this.chunkSize/2, 0, offsetZ + this.chunkSize/2);
        ground.receiveShadow = true;
        group.add(ground);

        // Ground Physics
        const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(offsetX + this.chunkSize/2, 0, offsetZ + this.chunkSize/2));
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(this.chunkSize/2, 0.1, this.chunkSize/2), groundBody);
        bodies.push(groundBody);

        // Procedural City Buildings (Low-poly abstraction)
        // Pseudo-random based on chunk coordinates
        const seed = Math.abs(cx * 73856093 ^ cz * 19349663);
        const buildingCount = (seed % 6); // 0 to 5 buildings per chunk
        
        for(let i=0; i<buildingCount; i++) {
            const bw = 3 + ((seed * (i+1)) % 5);
            const bh = 5 + ((seed * (i+2)) % 25);
            const bd = 3 + ((seed * (i+3)) % 5);
            
            const px = offsetX + 5 + ((seed * (i+4)) % (this.chunkSize - 10));
            const pz = offsetZ + 5 + ((seed * (i+5)) % (this.chunkSize - 10));

            const bGeo = new THREE.BoxGeometry(bw, bh, bd);
            const bMat = new THREE.MeshStandardMaterial({ 
                color: (i % 2 === 0) ? 0x444455 : 0x555566, 
                roughness: 0.8,
                metalness: 0.2
            });
            const bMesh = new THREE.Mesh(bGeo, bMat);
            bMesh.position.set(px, bh/2, pz);
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);

            const bBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(px, bh/2, pz));
            this.world.createCollider(RAPIER.ColliderDesc.cuboid(bw/2, bh/2, bd/2), bBody);
            bodies.push(bBody);
        }

        this.scene.add(group);
        this.loadedChunks.set(key, { group, bodies });
    }
}
`;

if (!code.includes("class ThirdPersonCamera")) {
    const importMatch = code.match(/import .* from 'three';/);
    if (importMatch) {
        code = code.replace(importMatch[0], importMatch[0] + "\n" + tpcClass);
    } else {
        code = tpcClass + "\n" + code;
    }
}

// Add state variables to GameEngine
if (!code.includes("public tpCamera: ThirdPersonCamera")) {
    code = code.replace("export class GameEngine {", "export class GameEngine {\n  public tpCamera: ThirdPersonCamera | null = null;\n  public chunkManager: ChunkManager | null = null;\n");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with open world classes");
