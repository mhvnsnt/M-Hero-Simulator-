const fs = require('fs');
let code = fs.readFileSync('src/game.ts', 'utf8');

// 1. Add mixer and actions to createFighter
const targetCreateFighter = `      customBoneMap: [], // { bone: THREE.Bone, bodyName: string, offsetMatrix: THREE.Matrix4 }
      autonomicSaturation: 0,`;
const replaceCreateFighter = `      customBoneMap: [], // { bone: THREE.Bone, bodyName: string, offsetMatrix: THREE.Matrix4 }
      mixer: null,
      actions: {},
      currentAction: null,
      autonomicSaturation: 0,`;
code = code.replace(targetCreateFighter, replaceCreateFighter);

// 2. Add animation logic to loadModelFromURL
const targetLoadModel = `// Basic bone mapping heuristic (simplified)
      model.traverse((child: any) => {`;
const replaceLoadModel = `if (object.animations && object.animations.length > 0) {
          player.mixer = new THREE.AnimationMixer(model);
          object.animations.forEach((clip: any) => {
              const name = clip.name.toLowerCase();
              player.actions[name] = player.mixer.clipAction(clip);
          });
          const idle = player.actions['idle'] || player.actions['standing'] || player.actions['wait'] || Object.values(player.actions)[0];
          if (idle) {
              idle.play();
              player.currentAction = idle;
          }
      }

      // Basic bone mapping heuristic (simplified)
      model.traverse((child: any) => {`;
code = code.replace(targetLoadModel, replaceLoadModel);

// 3. Play animation function
const targetPlayAnim = `  updateAI() {`;
const replacePlayAnim = `  playAnimation(player: any, animName: string, blendDuration = 0.2, timeScale = 1.0) {
      if (!player.mixer || !player.actions) return;
      const targetKey = Object.keys(player.actions).find(k => k.includes(animName.toLowerCase()));
      if (!targetKey) return;
      const newAction = player.actions[targetKey];
      if (player.currentAction !== newAction) {
          if (player.currentAction) player.currentAction.fadeOut(blendDuration);
          newAction.reset().setEffectiveTimeScale(timeScale).fadeIn(blendDuration).play();
          player.currentAction = newAction;
      }
  }

  updateAI() {`;
code = code.replace(targetPlayAnim, replacePlayAnim);

// 4. Update the visual syncing in animate to prioritize animation over physics during locomotion
// Let's find the customBoneMap syncing block
const targetSync = `      // Update custom GLTF skin using the calculated mappings
      if (f.customBoneMap && f.customBoneMap.length > 0) {
          f.customBoneMap.forEach((mapping: any) => {
              const body = f.bodies.get(mapping.bodyName);
              if (body) {
                  const pos = body.translation();
                  const rot = body.rotation();
                  if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
                      mapping.bone.position.set(pos.x, pos.y, pos.z);
                      mapping.bone.quaternion.set(rot.x, rot.y, rot.z, rot.w);
                  }
              }
          });
      }`;

const replaceSync = `      // Update custom GLTF skin using the calculated mappings
      if (f.customBoneMap && f.customBoneMap.length > 0) {
          // If the model is fully animated (has a mixer), we only sync the root position 
          // and let the Open-Source Locomotion animations handle the limbs.
          if (f.mixer) {
              const pelvis = f.bodies.get('pelvis');
              if (pelvis) {
                  const pos = pelvis.translation();
                  const rot = pelvis.rotation();
                  if (Number.isFinite(pos.x) && f.customModel) {
                      f.customModel.position.set(pos.x, pos.y - 1.0, pos.z);
                      
                      // Face movement direction
                      const linvel = pelvis.linvel();
                      if (Math.abs(linvel.x) > 0.5 || Math.abs(linvel.z) > 0.5) {
                          const angle = Math.atan2(linvel.x, linvel.z);
                          f.customModel.rotation.y = angle;
                      }
                  }
              }
          } else {
              // Legacy active ragdoll mapping
              f.customBoneMap.forEach((mapping: any) => {
                  const body = f.bodies.get(mapping.bodyName);
                  if (body) {
                      const pos = body.translation();
                      const rot = body.rotation();
                      if (Number.isFinite(pos.x) && Number.isFinite(rot.x)) {
                          mapping.bone.position.set(pos.x, pos.y, pos.z);
                          mapping.bone.quaternion.set(rot.x, rot.y, rot.z, rot.w);
                      }
                  }
              });
          }
      }`;
code = code.replace(targetSync, replaceSync);

// 5. Update mixer in animate
const targetAnimate = `    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);`;

const replaceAnimate = `    this.updateParticles(dt);

    [this.player1, this.player2].forEach(p => {
       if (p.mixer) {
           p.mixer.update(dtStr);
           // State machine to trigger animations
           if (p.state === 'standing' || p.state === 'recovery') {
               const linvel = p.bodies.get('pelvis')?.linvel();
               const speed = Math.sqrt((linvel?.x||0)**2 + (linvel?.z||0)**2);
               if (speed > 2.5) this.playAnimation(p, 'run', 0.2, speed * 0.3);
               else if (speed > 0.5) this.playAnimation(p, 'walk', 0.2, speed * 0.5);
               else this.playAnimation(p, 'idle', 0.2);
           } else if (p.state === 'windup' || p.state === 'striking') {
               this.playAnimation(p, 'punch', 0.1, 1.5);
           } else if (p.state === 'grounded') {
               this.playAnimation(p, 'death', 0.1);
           }
       }
    });

    this.renderer.render(this.scene, this.camera);`;
code = code.replace(targetAnimate, replaceAnimate);

fs.writeFileSync('src/game.ts', code);
console.log('Animation patch applied successfully');
