const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const classCode = `
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
    if (!this.isFlying) movementDirection.y = 0;
    movementDirection.normalize();

    const speed = this.isFlying ? 25.0 : 8.0;
    const velocity = movementDirection.multiplyScalar(speed * deltaTime);

    if (!this.isFlying) velocity.y -= 9.81 * deltaTime;

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

    this.mesh.position.lerp(this.targetPosition, this.positionLerpFactor * deltaTime);
    this.mesh.quaternion.slerp(this.targetRotation, this.rotationLerpFactor * deltaTime);
  }
}
`;

if (!code.includes("class KinematicPlayerController")) {
    const importMatch = code.match(/import .* from 'three';/);
    if (importMatch) {
        code = code.replace(importMatch[0], importMatch[0] + "\n" + classCode);
    } else {
        code = classCode + "\n" + code;
    }
}

// Attach kinematic controller to createFighter
const targetCreateFighter = `facs: new FACSController(),`;
const replaceCreateFighter = `facs: new FACSController(),\n      kinematic: null,`;
if (code.includes(targetCreateFighter)) {
    code = code.replace(targetCreateFighter, replaceCreateFighter);
}

// Replace physical parts setup in createFighter
const targetAddGroup = `this.scene.add(f.group);\n    f.group.position.set(x, y, z);`;
const replaceAddGroup = `this.scene.add(f.group);\n    f.group.position.set(x, y, z);\n    f.kinematic = new KinematicPlayerController(f.group, this.world, new THREE.Vector3(x, y + 1.2, z));`;
if (code.includes(targetAddGroup)) {
    code = code.replace(targetAddGroup, replaceAddGroup);
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched game.ts with KinematicPlayerController");
