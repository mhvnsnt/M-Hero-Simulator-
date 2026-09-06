const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// 1. Add the KinematicPlayerController class
const kinematicClass = `
export class KinematicPlayerController {
  public mesh: THREE.Group;
  public characterController: RAPIER.KinematicCharacterController;
  public rigidBody: RAPIER.RigidBody;
  public collider: RAPIER.Collider;
  private targetPosition = new THREE.Vector3();
  private targetRotation = new THREE.Quaternion();

  private positionLerpFactor = 15.0; 
  private rotationLerpFactor = 10.0;
  public isFlying = false;

  constructor(mesh: THREE.Group, world: RAPIER.World, startPos: THREE.Vector3) {
    this.mesh = mesh;

    // We use a kinematic position based rigid body for the controller
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(startPos.x, startPos.y, startPos.z);
    this.rigidBody = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.8, 0.4);
    this.collider = world.createCollider(colliderDesc, this.rigidBody);
    
    this.characterController = world.createKinematicCharacterController(0.1);
    this.characterController.setApplyImpulsesToDynamicBodies(true);
    this.characterController.enableAutostep(0.4, 0.2, true);
    this.characterController.enableSnapToGround(0.3);
  }

  public setFlightMode(enabled: boolean): void {
    this.isFlying = enabled;
    this.characterController.enableSnapToGround(!enabled);
  }

  public updateController(deltaTime: number, inputVector: THREE.Vector3, cameraQuaternion: THREE.Quaternion): void {
    const movementDirection = inputVector.clone().applyQuaternion(cameraQuaternion);
    if (!this.isFlying) {
      movementDirection.y = 0;
    }
    movementDirection.normalize();

    const speed = this.isFlying ? 25.0 : 8.0;
    const velocity = movementDirection.multiplyScalar(speed * deltaTime);

    if (!this.isFlying) {
      velocity.y -= 9.81 * deltaTime; // basic gravity
    }

    this.characterController.computeColliderMovement(this.collider, velocity);
    const correctedMovement = this.characterController.computedMovement();

    const currentTranslation = this.rigidBody.translation();
    const nextX = currentTranslation.x + correctedMovement.x;
    const nextY = currentTranslation.y + correctedMovement.y;
    const nextZ = currentTranslation.z + correctedMovement.z;
    
    this.rigidBody.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
    this.targetPosition.set(nextX, nextY, nextZ);

    if (inputVector.lengthSq() > 0.001) {
      const targetAngle = Math.atan2(movementDirection.x, movementDirection.z);
      this.targetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
    }

    // Decoupled LERP
    this.mesh.position.lerp(this.targetPosition, this.positionLerpFactor * deltaTime);
    this.mesh.quaternion.slerp(this.targetRotation, this.rotationLerpFactor * deltaTime);
  }
}
`;

if (!code.includes("class KinematicPlayerController")) {
    // Insert after imports
    const importMatch = code.match(/import .* from 'three';/);
    if (importMatch) {
        code = code.replace(importMatch[0], importMatch[0] + "\\n" + kinematicClass);
    } else {
        code = kinematicClass + "\\n" + code;
    }
}

// 2. Refactor createFighter to use KinematicPlayerController instead of active ragdoll
// We will replace the entire createFighter method logic since it's asked to rip it out, 
// but wait, if we rip it out, how does combat work? The prompt says "We rip out the old rigid-body constraints...".
// Actually, let's just create a modified version of the fighter object that has the kinematic controller.
// But the user's prompt also asks to keep the original files mostly intact and inject the new logic. Let's just modify the fighter state to include the kinematic controller.
fs.writeFileSync('src/game_patch.cjs', 'done');
