const fs = require('fs');

// 1. Create facs.ts
const facsCode = `
import * as THREE from 'three';

export class FACSController {
    mesh: THREE.SkinnedMesh | null = null;
    dictionary: { [key: string]: number } = {};
    
    bind(model: THREE.Object3D) {
        // Recursively find the first SkinnedMesh with morph targets
        model.traverse((child: any) => {
            if (child.isMesh && child.morphTargetDictionary) {
                this.mesh = child;
                this.dictionary = child.morphTargetDictionary;
                console.log("FACS bound to:", child.name, "with", Object.keys(this.dictionary).length, "morphs");
            }
        });
    }

    setMorph(name: string, value: number) {
        if (this.mesh && this.dictionary[name] !== undefined && this.mesh.morphTargetInfluences) {
            this.mesh.morphTargetInfluences[this.dictionary[name]] = Math.max(0, Math.min(1, value));
        }
    }

    updateAutonomic(healthRatio: number, staminaRatio: number, stress: number) {
        if (!this.mesh) return;
        
        // Open-source ARKit / ReadyPlayerMe standard blendshapes
        const exhaust = Math.max(0, 1.0 - staminaRatio);
        this.setMorph('jawOpen', exhaust * 0.8);
        this.setMorph('mouthOpen', exhaust * 0.8);
        this.setMorph('mouthSmile', healthRatio > 0.8 ? 0.5 : 0.0);
        
        const pain = Math.max(0, 1.0 - healthRatio);
        this.setMorph('browInnerUp', pain);
        this.setMorph('browDownLeft', pain * 0.5);
        this.setMorph('browDownRight', pain * 0.5);
        this.setMorph('eyeSquintLeft', pain * 0.8);
        this.setMorph('eyeSquintRight', pain * 0.8);
        
        // Stress mapping
        if (stress > 80) {
            this.setMorph('eyeWideLeft', 0.8);
            this.setMorph('eyeWideRight', 0.8);
        } else {
            this.setMorph('eyeWideLeft', 0.0);
            this.setMorph('eyeWideRight', 0.0);
        }
    }
}
`;
fs.writeFileSync('src/facs.ts', facsCode);

// 2. Modify game.ts
let code = fs.readFileSync('src/game.ts', 'utf8');

// Imports
if (!code.includes("FACSController")) {
    code = code.replace("import { VFXEngine } from './vfx';", "import { VFXEngine } from './vfx';\nimport { FACSController } from './facs';");
}

// createFighter
const targetCreateFighter = `      actions: {},
      currentAction: null,
      autonomicSaturation: 0,`;
const replaceCreateFighter = `      actions: {},
      currentAction: null,
      facs: new FACSController(),
      grappleJoint: null,
      autonomicSaturation: 0,`;
if (code.includes(targetCreateFighter)) {
    code = code.replace(targetCreateFighter, replaceCreateFighter);
}

// loadModelFromURL
const targetLoadModel = `      player.group.add(model);
      player.customModel = model;`;
const replaceLoadModel = `      player.group.add(model);
      player.customModel = model;
      player.facs.bind(model);`;
if (code.includes(targetLoadModel)) {
    code = code.replace(targetLoadModel, replaceLoadModel);
}

// Autonomic update in animate/physics loop
const targetUpdateAuto = `// Update Autonomic Systems
    [this.player1, this.player2].forEach(p => {
       let stressGain = 0;`;
const replaceUpdateAuto = `// Update Autonomic Systems
    [this.player1, this.player2].forEach(p => {
       if (p.facs) p.facs.updateAutonomic(p.health/p.maxHealth, p.stamina/100, p.autonomicSaturation);
       let stressGain = 0;`;
if (code.includes(targetUpdateAuto)) {
    code = code.replace(targetUpdateAuto, replaceUpdateAuto);
}

// Grapple Mechanics mapping (Using Rapier joints as Open Source Physics Constraint)
const targetControls = `if (this.keys['KeyX'] || this.keys['BtnX']) {
       this.startStrike(this.player1, 'rightPunch', shift);
       this.keys['BtnX'] = false;
    }`;
const replaceControls = `if (this.keys['KeyX'] || this.keys['BtnX']) {
       this.startStrike(this.player1, 'rightPunch', shift);
       this.keys['BtnX'] = false;
    }
    if (this.keys['KeyG'] || this.keys['LB']) { // Grapple trigger
       this.attemptGrapple(this.player1, this.player2);
       this.keys['KeyG'] = false;
       this.keys['LB'] = false;
    }`;
if (code.includes(targetControls)) {
    code = code.replace(targetControls, replaceControls);
}

// Grapple function
const grappleFunc = `
  attemptGrapple(attacker: any, defender: any) {
      if (attacker.grappleJoint || attacker.state !== 'standing' || defender.state === 'grounded') return;
      
      const p1 = attacker.bodies.get('pelvis');
      const p2 = defender.bodies.get('pelvis');
      if (!p1 || !p2) return;
      
      const pos1 = p1.translation();
      const pos2 = p2.translation();
      const dist = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.z - pos2.z, 2));
      
      // Open-Source Rapier Physics Joint integration for dynamic grappling
      if (dist < 1.8) {
          attacker.state = 'grappling';
          defender.state = 'grappled';
          
          // Apply a spherical joint between the two characters
          const jointParams = RAPIER.JointData.spherical(
              new RAPIER.Vector3(0, 0, 0),
              new RAPIER.Vector3(0, 0, 0)
          );
          attacker.grappleJoint = this.world.createImpulseJoint(jointParams, p1, p2, true);
          this.updateUI({ debugMsg: \`Grapple Established!\` });
          
          setTimeout(() => {
              if (attacker.grappleJoint) {
                  this.world.removeImpulseJoint(attacker.grappleJoint, true);
                  attacker.grappleJoint = null;
                  
                  // Throw recoil (IK + Physics throw)
                  p2.applyImpulse(new RAPIER.Vector3((pos2.x - pos1.x)*20, 15, (pos2.z - pos1.z)*20), true);
                  
                  attacker.state = 'standing';
                  defender.state = 'grounded';
                  defender.health = Math.max(0, defender.health - 150); // Grapple damage
                  this.updateUI({ debugMsg: \`Grapple Break & Throw\` });
              }
          }, 2000);
      }
  }
`;
if (!code.includes('attemptGrapple(attacker: any, defender: any)')) {
    code = code.replace("updateDefense(f: any, isP1: boolean) {", grappleFunc + "\n  updateDefense(f: any, isP1: boolean) {");
}

fs.writeFileSync('src/game.ts', code);
console.log("Patched FACS and Grappling into game.ts");
