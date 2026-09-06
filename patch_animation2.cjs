const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

const targetSync = `      // Update custom GLTF skin using the calculated mappings
      if (f.customBoneMap && f.customBoneMap.length > 0) {
          f.customBoneMap.forEach((mapping: any) => {
              const body = f.bodies.get(mapping.bodyName);
              if (body) {
                  const pos = body.translation();
                  const rot = body.rotation();
                  if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
                      const bodyQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
                      const targetQuat = bodyQuat.multiply(mapping.offsetQuat);
                      
                      const parentWorldQuat = new THREE.Quaternion();
                      if (mapping.bone.parent) {
                          mapping.bone.parent.getWorldQuaternion(parentWorldQuat);
                      }
                      
                      // rotation
                      const localQuat = parentWorldQuat.clone().invert().multiply(targetQuat);
                      mapping.bone.quaternion.copy(localQuat);
                      
                      // translation (root only)
                      if (mapping.isRoot) {
                          const bodyPos = new THREE.Vector3(pos.x, pos.y, pos.z);
                          const targetPos = bodyPos.add(mapping.bodyToBoneOffset);
                          const parentWorld = mapping.bone.parent ? mapping.bone.parent.matrixWorld : new THREE.Matrix4();
                          const localPos = targetPos.applyMatrix4(parentWorld.clone().invert());
                          mapping.bone.position.copy(localPos);
                      }
                      
                      mapping.bone.updateMatrix();
                      mapping.bone.updateMatrixWorld(true);
                  }
              }
          });
      }`;

const replaceSync = `      // Update custom GLTF skin using the calculated mappings
      if (f.customBoneMap && f.customBoneMap.length > 0) {
          if (f.mixer) {
              const pelvis = f.bodies.get('pelvis');
              if (pelvis && f.customModel) {
                  const pos = pelvis.translation();
                  if (Number.isFinite(pos.x)) {
                      f.customModel.position.set(pos.x, pos.y - 1.0, pos.z);
                      
                      const linvel = pelvis.linvel();
                      if (Math.abs(linvel.x) > 0.5 || Math.abs(linvel.z) > 0.5) {
                          const angle = Math.atan2(linvel.x, linvel.z);
                          // Smooth rotation towards velocity vector
                          const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                          f.customModel.quaternion.slerp(targetQuat, 0.1);
                      }
                  }
              }
          } else {
              f.customBoneMap.forEach((mapping: any) => {
                  const body = f.bodies.get(mapping.bodyName);
                  if (body) {
                      const pos = body.translation();
                      const rot = body.rotation();
                      if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
                          const bodyQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
                          const targetQuat = bodyQuat.multiply(mapping.offsetQuat);
                          
                          const parentWorldQuat = new THREE.Quaternion();
                          if (mapping.bone.parent) {
                              mapping.bone.parent.getWorldQuaternion(parentWorldQuat);
                          }
                          
                          // rotation
                          const localQuat = parentWorldQuat.clone().invert().multiply(targetQuat);
                          mapping.bone.quaternion.copy(localQuat);
                          
                          // translation (root only)
                          if (mapping.isRoot) {
                              const bodyPos = new THREE.Vector3(pos.x, pos.y, pos.z);
                              const targetPos = bodyPos.add(mapping.bodyToBoneOffset);
                              const parentWorld = mapping.bone.parent ? mapping.bone.parent.matrixWorld : new THREE.Matrix4();
                              const localPos = targetPos.applyMatrix4(parentWorld.clone().invert());
                              mapping.bone.position.copy(localPos);
                          }
                          
                          mapping.bone.updateMatrix();
                          mapping.bone.updateMatrixWorld(true);
                      }
                  }
              });
          }
      }`;
code = code.replace(targetSync, replaceSync);
fs.writeFileSync('src/game.ts', code);
console.log('Animation patch 2 applied');
