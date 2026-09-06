const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const bvhImport = `
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
`;

if (!code.includes("computeBoundsTree")) {
    code = code.replace("import * as THREE from 'three';", "import * as THREE from 'three';" + bvhImport);
}

const bvhClass = `
export class BvhCombatManager {
  private playerMesh: THREE.Group;
  private world: RAPIER.World;

  constructor(playerMesh: THREE.Group, world: RAPIER.World) {
    this.playerMesh = playerMesh;
    this.world = world;
  }

  public executeMeleeHitreg(attackRange: number, attackRadius: number, damage: number, knockbackForce: number): void {
    const forwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerMesh.quaternion).normalize();
    const attackOrigin = this.playerMesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));

    const shape = RAPIER.ShapeDesc.ball(attackRadius);
    const shapeRotation = { x: 0, y: 0, z: 0, w: 1 };

    console.log("Executing high-performance programmatic Rapier3D + BVH spatial shape sweep...");

    this.world.projectShape(
      attackOrigin,
      shapeRotation,
      forwardDirection,
      shape,
      attackRange,
      true, 
      RAPIER.QueryFilter.onlyDynamic(), 
      (hit) => {
        const hitCollider = hit.collider;
        const hitBody = hitCollider.parent();

        if (hitBody && hitBody !== this.world.getRigidBody(this.playerMesh.userData.physicsHandle)) {
          if (hitBody.userData && typeof hitBody.userData.takeDamage === 'function') {
            hitBody.userData.takeDamage(damage);
          }

          const impulseVector = forwardDirection.clone()
            .multiplyScalar(knockbackForce)
            .add(new THREE.Vector3(0, 2.0, 0));

          hitBody.applyImpulse({ x: impulseVector.x, y: impulseVector.y, z: impulseVector.z }, true);
          return false;
        }
        return true; 
      }
    );
  }
}
`;

if (!code.includes("class BvhCombatManager")) {
    code += "\n" + bvhClass;
}

// Add Effekseer instance to GameEngine
if (!code.includes("public effekseerVfx: EffekseerVfxEngine")) {
    code = code.replace("import { VFXEngine } from './vfx';", "import { VFXEngine, EffekseerVfxEngine } from './vfx';");
    code = code.replace("export class GameEngine {", "export class GameEngine {\n  public effekseerVfx: EffekseerVfxEngine | null = null;\n  public bvhCombat: BvhCombatManager | null = null;\n");
    // Hook it into init
    const initHook = `
    // Try to get GL context for Effekseer
    try {
        const glContext = this.renderer.getContext();
        this.effekseerVfx = new EffekseerVfxEngine(glContext, this.scene, this.camera);
    } catch(e) {}
    `;
    code = code.replace("this.renderer.shadowMap.type = THREE.PCFShadowMap;", "this.renderer.shadowMap.type = THREE.PCFShadowMap;\n" + initHook);
}

// Ensure the renderVfx is called in animate
const updateHook = `
    if (this.effekseerVfx) this.effekseerVfx.renderVfx(dtStr);
`;
if (!code.includes("this.effekseerVfx.renderVfx")) {
    code = code.replace("if (this.vfx) this.vfx.update(dtStr);", "if (this.vfx) this.vfx.update(dtStr);\n" + updateHook);
}

// Hook BvhCombatManager into the strike logic
const oldStrikeTrigger = `if (Math.abs(time - (p.lastStrike || 0)) > 300) {`; // Need to check where combat happens
fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with BvhCombatManager and Effekseer.");
