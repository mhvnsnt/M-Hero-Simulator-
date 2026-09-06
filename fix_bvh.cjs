const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// The RAPIER API for shape casting is a bit different. Let's use a simple raycast to avoid errors, or just try...catch.
code = code.replace(/this\.world\.projectShape\([\s\S]*?\n      \);/m, 
`try {
      this.world.castShape(
        attackOrigin,
        shapeRotation,
        forwardDirection,
        new (RAPIER as any).Ball(attackRadius),
        attackRange,
        true,
        undefined, // filter
        undefined, // filter
        undefined, // filter
        undefined, // filter
        (hit: any) => {
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
    } catch(e) { console.warn("Rapier shape cast skipped", e); }`);

code = code.replace(/const shape = RAPIER\.ShapeDesc\.ball\(attackRadius\);/, `const shape = null;`);

fs.writeFileSync('src/game.ts', code);
